from trame.app import TrameApp, get_server, asynchronous
from trame.ui.vuetify3 import SinglePageLayout
from trame.widgets import vuetify3 as v3
from trame.widgets import iframe, html
from trame.widgets import paraview, client
from trame.decorators import change


from pathlib import Path

from paraview import simple

import asyncio
import os
import json

def get_or_create_eventloop():
    try:
        return asyncio.get_event_loop()
    except RuntimeError as ex:
        if "There is no current event loop in thread" in str(ex):
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return asyncio.get_event_loop()
        else:
            raise ex
        
get_or_create_eventloop()
# -----------------------------------------------------------------------------
# Trame setup
# -----------------------------------------------------------------------------
class VTUFileReaderApp(TrameApp):
    DEFAULT_FILE_PATH = "out/field_export.bp"
    def __init__(self, server=None):
        super().__init__(server)
        self.server.cli.add_argument("--data", help="Path to state file", dest="data")
        self.reader = None
        self.playing = False

        # Preload paraview modules onto server
        paraview.initialize(self.server)

        self.ctrl.on_server_ready.add(self.load_data)
        self._build_ui()

    
    async def child_receive_msg(self, data):
        print("Received message: ", data)
        # data = json.loads(data)
        print("Data is: ", data)
        action = data.get("action", None)
        match action:
            case "downloadData":
                filepath = data.get("filepath", self.DEFAULT_FILE_PATH)
                self.read_data_from(filepath)
            case "play":
                await self.play_animation()
            case "reverse":
                await self.reverse_animation()
            case "toFrame":
                t = data["time"]
                self.set_animation_time_by_index(t)
            case "switchFieldOption":
                field_option = data["option"]
                self.color_by(field_option)
                
        
# -----------------------------------------------------------------------------
# ParaView code
# -----------------------------------------------------------------------------
    INTERVAL = 0.2
    
    async def play_animation(self):
        if self.state.field_option == "Solid": return
        
        async def loop():
            for step in self.animationScene.TimeKeeper.TimestepValues:
                print(f"On step: {step}")
                self.animationScene.AnimationTime = step
                self.ctrl.view_update()
                await asyncio.sleep(self.INTERVAL)
                
        if not self.playing:
            self.playing = True
            await asynchronous.create_task(loop())
            self.playing = False
            
    async def reverse_animation(self):
        if self.state.field_option == "Solid": return
        if not self.playing:
            self.playing = True
            for step in reversed(self.animationScene.TimeKeeper.TimestepValues):
                print(f"On step: {step}")
                self.animationScene.AnimationTime = step
                self.ctrl.view_update()
                await asyncio.sleep(self.INTERVAL)
                pass
            self.playing = False
    
    def set_animation_time_by_index(self, index):
        steps = self.animationScene.TimeKeeper.TimestepValues
        calculated_index = len(steps)-1 if (index > len(steps)-1) else (0 if index < 0 else index)
        print(f"Going to step {calculated_index}")
        step = steps[calculated_index]
        self.animationScene.AnimationTime = step
        self.ctrl.view_update()
        return calculated_index
        
    def to_next_frame(self):
        if self.state.field_option == "Solid": return
        new_index = self.set_animation_time_by_index(self.state.time_index+1)
        self.state.time_index = new_index
        
       
    def to_previous_frame(self):
        if self.state.field_option == "Solid": return
        new_index = self.set_animation_time_by_index(self.state.time_index-1)
        self.state.time_index = new_index
    
    def to_last_frame(self):
        if self.state.field_option == "Solid": return
        steps = self.animationScene.TimeKeeper.TimestepValues
        new_index = self.set_animation_time_by_index(len(steps)-1)
        self.state.time_index = new_index
    
    def to_first_frame(self):
        if self.state.field_option == "Solid": return
        new_index = self.set_animation_time_by_index(0)
        self.state.time_index = new_index
    
    def read_data_from(self, fname, file_type=".bp"):
        print(f"Reading from {fname}")
        filepath = os.path.join(os.getcwd(), fname)
        f = []
        for (dirpath, dirnames, filename) in os.walk(filepath):
            f.extend(filename)
        out = []
        for filename in f:
            # print(filename)
            out.append(filepath+f"/{filename}")
            
        match file_type:
            case ".bp":
                self.reader = simple.ADIOS2VTXReader(FileName=filepath)
        self.reader.UpdatePipeline()
        data_info = self.reader.GetDataInformation()
        # self.reader = simple.XMLUnstructuredGridReader(FileName=out)
        # print(self.reader.PointArrayStatus)
        fields = []
        for data_set, location in (
            (data_info.GetPointDataInformation(), "POINTS"),
            (data_info.GetCellDataInformation(), "CELLS")
        ):
            for index in range(data_set.GetNumberOfArrays()):
                array = data_set.GetArrayInformation(index)
                if array is None or not array.GetName():
                    continue
                field_name = array.GetName()
                fields.append(field_name)
        # self.fields = self.reader.PointArrayStatus
        # print("Associated fields: ", self.fields)
        
        # all_fields = ("Solid", *self.fields)
        self.state.field_option = fields[0]
        self.state.field_options = fields
        self.state.time_index = 0
        self.animationScene = simple.GetAnimationScene()
        self.animationScene.UpdateAnimationUsingDataTimeSteps()
        
        print(f"The current time is {self.animationScene.AnimationTime}")
        print("Time Step Values: ", self.animationScene.TimeKeeper.TimestepValues)
        
        self.representation= simple.Show(self.reader)
        
        # calculate_ranges()
        self.representation.ColorBy(("POINTS", self.state.field_option))
        
        self.representation.SetScalarBarVisibility(self.view, True)
        simple.UpdateScalarBars(self.view)
        
        self.view = simple.GetActiveView()
        self.view.MakeRenderWindowInteractor(True)
        simple.Render(self.view)
        self.ctrl.view_update()
    
    def download_from(self, fname):
        self.read_vtk_from(fname)
        self.ctrl.view_update()
        print("I'm sending a message!")
        self.ctrl.child_post_message([{ "emit": 'child-to-parent', "value": "Hell0 there -from your child" }])
        
    def load_data(self, **_kwargs):
        # CLI
        args, _ = self.server.cli.parse_known_args()
        if args.data:
            self.read_vtk_from(str(args.data))
        else:
            self.view = simple.CreateRenderView()
        self.state.dirty("field_option")
        self.state.dirty("field_options")

        # HTML
        with SinglePageLayout(self.server) as self.ui:
            comm = iframe.Communicator(
                event_names=["parent_to_child"],
                parent_to_child=(self.child_receive_msg, "[$event]"),
            )
            self.ctrl.child_post_message = comm.post_message
            
            self.ui.icon.click = self.ctrl.view_reset_camera
            self.ui.title.set_text("Post Processing Page")
            showing_toolbar = False
            if showing_toolbar:
                with self.ui.toolbar:
                    v3.VBtn(
                        icon="mdi-download",
                        click=lambda:self.download_from("out/field_export.bp")
                    )
                    v3.VBtn(
                        icon="mdi-step-backward-2",
                        click=self.to_first_frame
                    )
                    v3.VBtn(
                        icon="mdi-step-backward",
                        click=self.to_previous_frame # <-- Use that reset_camera (init order does not matter)
                    )
                    v3.VBtn(
                        icon="mdi-arrow-left",
                        click=self.reverse_animation
                    )
                    v3.VBtn(
                        icon="mdi-play",
                        click=self.play_animation
                    )
                    v3.VBtn(
                        icon="mdi-step-forward",
                        click=self.to_next_frame
                    )
                    v3.VBtn(
                        icon="mdi-step-forward-2",
                        click=self.to_last_frame 
                    )
                    v3.VSelect(
                        label="Choose an Option",
                        v_model=("field_option", ),
                        items=("field_options",),
                        variant="solo",
                    )
                    
            with self.ui.content:
                with v3.VContainer(fluid=True, classes="pa-0 fill-height"):
                    html_view = paraview.VtkRemoteView(self.view)
                    self.ctrl.view_reset_camera = html_view.reset_camera
                    self.ctrl.view_update = html_view.update 

# -----------------------------------------------------------------------------
# GUI
# -----------------------------------------------------------------------------

    def _build_ui(self):
        self.state.trame__title = "VTU File Reader"

        with SinglePageLayout(self.server) as self.ui:
            self.ui.icon.click = self.ctrl.view_reset_camera
            self.ui.title.set_text("ParaView State Viewer")

            with self.ui.content:
                with v3.VContainer(fluid=True, classes="pa-0 fill-height"):
                    client.Loading("Loading state")
                    
    @change("field_options")
    def on_field_options_change(self, field_options, **_kwargs):
        print("Available options are now: ", field_options)
    
    def color_by(self, field_option):
        if field_option == "Solid": return
        print(f"\n\nSwitching field option to {field_option}")
        self.state.field_option = field_option
        if self.representation: 
            print(f"Coloring by: ", field_option)
            self.representation.ColorBy(("POINTS", field_option))
            simple.UpdateScalarBars(self.view)
        if self.ctrl.view_update:
            print("Updating the view")
            self.ctrl.view_update()
            
    @change("field_option")
    def on_field_option_change(self, field_option, **_kwargs):
        # old_transfer_function = simple.GetColorTransferFunction(self.state.field_option)
        self.color_by(field_option)
# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main():
    app = VTUFileReaderApp()
    app.server.start()

if __name__ == "__main__":
    main()
