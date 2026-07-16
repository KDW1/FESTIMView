from trame.app import TrameApp, get_server, asynchronous
from trame.ui.vuetify3 import SinglePageLayout
from trame.widgets import vuetify3 as v3
from trame.widgets import paraview, client, iframe
from trame.decorators import change
from paraview.numpy_support import vtk_to_numpy
import paraview.servermanager as sm


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
                self.read_vtk_from("vtk_temp")
            case "play":
                await self.play_animation()
            case "reverse":
                await self.reverse_animation()
            case "toFrame":
                t = data["time"]
                self.set_animation_time_by_index(t)
            case "switchFieldOption":
                field_option = data["option"]
                print("Switching to field option, ", field_option)
                if self.reader: 
                    self.representation = simple.Show(self.reader)
                    simple.ColorBy(self.representation, ("POINTS", field_option))
                if self.ctrl.view_update:
                    self.ctrl.view_update()
                
        
# -----------------------------------------------------------------------------
# ParaView code
# -----------------------------------------------------------------------------
    INTERVAL = 0.05
    
    async def play_animation(self):
        if self.state.field_option == "Solid": return
        
        async def loop():
            for step in self.animationScene.TimeKeeper.TimestepValues:
                print(f"On step: {step}")
                self.animationScene.AnimationTime = step
                self.update_color_range()
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
                self.update_color_range()
                self.ctrl.view_update()
                await asyncio.sleep(self.INTERVAL)
                pass
            self.playing = False
    
    def set_animation_time_by_index(self, index):
        print(f"Going to step {index}")
        steps = self.animationScene.TimeKeeper.TimestepValues
        step = steps[index]
        self.animationScene.AnimationTime = step
        self.update_color_range()
        self.ctrl.view_update()
        
    def to_next_frame(self):
        if self.state.field_option == "Solid": return
        if self.playing:
            return
        print("To next frame")
        print(f"(Before) t={self.animationScene.AnimationTime}")
        steps = self.animationScene.TimeKeeper.TimestepValues
        max_time, min_time = max(steps), min(steps)
        current_time = self.animationScene.AnimationTime
        new_time = current_time + min_time
        
        if new_time <= max_time:
            self.animationScene.AnimationTime = new_time
        self.update_color_range()
        print(f"(After) t={self.animationScene.AnimationTime}")
        self.ctrl.view_update()
       
    def to_previous_frame(self):
        if self.state.field_option == "Solid": return
        if self.playing:
            return
        print("To previous frame")
        print(f"(Before) t={self.animationScene.AnimationTime}")
        steps = self.animationScene.TimeKeeper.TimestepValues
        max_time, min_time = max(steps), min(steps)
        current_time = self.animationScene.AnimationTime
        new_time = current_time - min_time
        
        if new_time >= min_time:
            self.animationScene.AnimationTime = new_time
        self.update_color_range()
        print(f"(After) t={self.animationScene.AnimationTime}")
        self.ctrl.view_update()
        pass
    
    def to_last_frame(self):
        if self.state.field_option == "Solid": return
        if self.playing:
            return
        print("To last frame")
        print(f"(Before) t={self.animationScene.AnimationTime}")
        steps = self.animationScene.TimeKeeper.TimestepValues
        max_time, min_time = max(steps), min(steps)
            
        self.animationScene.AnimationTime = max_time
        self.update_color_range()
        self.ctrl.view_update()
        print(f"(After) t={self.animationScene.AnimationTime}")
    
    def to_first_frame(self):
        if self.state.field_option == "Solid": return
        if self.playing:
            return
        print("To last frame")
        print(f"(Before) t={self.animationScene.AnimationTime}")
        steps = self.animationScene.TimeKeeper.TimestepValues
        max_time, min_time = max(steps), min(steps)
            
        self.animationScene.AnimationTime = min_time
        self.update_color_range()
        self.ctrl.view_update()
        print(f"(After) t={self.animationScene.AnimationTime}")
        pass
    
    def read_vtk_from(self, fname):
        print(f"Reading from {fname}")
        filepath = os.path.join(os.getcwd(), fname)
        f = []
        for (dirpath, dirnames, filename) in os.walk(filepath):
            f.extend(filename)
        out = []
        for filename in f:
            # print(filename)
            out.append(filepath+f"/{filename}")
        # print("Filepaths: ", out)
        self.reader = simple.XMLUnstructuredGridReader(FileName=out)
        print(self.reader.PointArrayStatus)
        self.fields = self.reader.PointArrayStatus
        # print("Associated fields: ", self.fields)
        
        all_fields = ("Solid", *self.fields)
        self.state.field_option = "Solid"
        self.state.field_options = all_fields
        self.animationScene = simple.GetAnimationScene()
        self.animationScene.UpdateAnimationUsingDataTimeSteps()
        
        print(f"The current time is {self.animationScene.AnimationTime}")
        print("Time Step Values: ", self.animationScene.TimeKeeper.TimestepValues)
        
        self.representation= simple.Show(self.reader)
        
        min, max = float("inf"), float("-inf")
        def calculate_ranges():
            calculated_ranges = dict()
            print(all_fields)
            for field_option in all_fields:
                if field_option == "Solid":
                    continue
                for time in self.animationScene.TimeKeeper.TimestepValues:
                    self.animationScene.AnimationTime = time
                    ranges = self.reader.PointData[field_option].GetRange(-1)
                    print(f"Time t={time}")
                    print(f"Number of components is {self.reader.PointData[field_option].GetNumberOfComponents()}")
                    print(f"Range for data is: {ranges[0]} to {ranges[1]}")
                    if ranges[0] < min:
                        min = ranges[0]
                    if ranges[1] > max:
                        max = ranges[1]
                print("Field Option: ", field_option)
                calculated_ranges[field_option] = (min, max)
            
            self.field_ranges = calculated_ranges
            
        # calculate_ranges()
        simple.ColorBy(self.representation, ("POINTS", "Solid"))
        self.view = simple.GetActiveView()
        self.view.MakeRenderWindowInteractor(True)
        simple.Render(self.view)
    
    def download_from(self, fname):
        self.read_vtk_from(fname)
        self.ctrl.view_update()
        print("I'm sending a message!")
        self.ctrl.child_post_message([{ "emit": 'child-to-parent', "value": "Hell0 there -from your child" }])
    
    def update_color_range(self):
        pass
        # grid_data = sm.Fetch(self.reader)
        # field_array = grid_data.GetPointData().GetArray(self.state.field_option)
        # np_array = vtk_to_numpy(field_array)
        # print(len(np_array))
        # print(vtk_to_numpy(field_array))
        # self.representation.RescaleTransferFunctionToDataRange(True, False)
        # simple.UpdateScalarBars(self.view)
        
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
            if __name__ == "__main__":
                with self.ui.toolbar:
                    v3.VBtn(
                        icon="mdi-download",
                        click=lambda:self.download_from("vtk_temp")
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
                        v_model=("field_option", "Solid"),
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
        
    @change("field_option")
    def on_field_option_change(self, field_option, **_kwargs):
        old_field = self.state.field_option
        # old_transfer_function = simple.GetColorTransferFunction(self.state.field_option)
        self.state.field_option = field_option
        if self.reader: 
            self.representation = simple.Show(self.reader)
            simple.ColorBy(self.representation, ("POINTS", field_option))
            if field_option != "Solid":
                # Custom Range Generation
                # transfer_function = simple.GetColorTransferFunction(field_option)
                # transfer_function.RescaleTransferFunction(self.field_ranges[field_option][0], self.field_ranges[field_option][1])
                
                self.representation.SetScalarBarVisibility(self.view, True)
                
                simple.UpdateScalarBars(self.view)
        if self.ctrl.view_update:
            self.ctrl.view_update()
        print(f"Switching field option to {field_option}")
# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main():
    app = VTUFileReaderApp()
    app.server.start()

if __name__ == "__main__":
    main()
