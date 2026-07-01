from trame.app import TrameApp, get_server
from trame.ui.vuetify3 import SinglePageLayout
from trame.widgets import vuetify3 as v3
from trame.widgets import paraview, client
from trame.decorators import change

from pathlib import Path

from paraview import simple

import asyncio
import os

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
        self.playing = False

        # Preload paraview modules onto server
        paraview.initialize(self.server)

        self.ctrl.on_server_ready.add(self.load_data)
        self._build_ui()

    
# -----------------------------------------------------------------------------
# ParaView code
# -----------------------------------------------------------------------------
    INTERVAL = 0.02
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
            self.ctrl.view_update()
            
        print(f"(After) t={self.animationScene.AnimationTime}")
        self.ctrl.view_update()
        
    async def play_animation(self):
        if self.state.field_option == "Solid": return
        if not self.playing:
            self.playing = True
            for step in self.animationScene.TimeKeeper.TimestepValues:
                print(f"On step: {step}")
                self.animationScene.AnimationTime = step
                self.ctrl.view_update()
                await asyncio.sleep(self.INTERVAL)
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
            self.ctrl.view_update()
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
        self.ctrl.view_update()
        print(f"(After) t={self.animationScene.AnimationTime}")
        pass
    
    def to_first_frame(self):
        if self.state.field_option == "Solid": return
        if self.playing:
            return
        print("To last frame")
        print(f"(Before) t={self.animationScene.AnimationTime}")
        steps = self.animationScene.TimeKeeper.TimestepValues
        max_time, min_time = max(steps), min(steps)
            
        self.animationScene.AnimationTime = min_time
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
        self.reader  = simple.XMLUnstructuredGridReader(FileName=out)
        print(self.reader.PointArrayStatus)
        self.fields = self.reader.PointArrayStatus
        # print("Associated fields: ", self.fields)
        
        self.state.field_option = "Solid"
        self.state.field_options = ("Solid", *self.fields)
        self.state.dirty("field_option")
        self.state.dirty("field_options")
        self.animationScene = simple.GetAnimationScene()
        self.animationScene.UpdateAnimationUsingDataTimeSteps()
        
        print(f"The current time is {self.animationScene.AnimationTime}")
        print("Time Step Values: ", self.animationScene.TimeKeeper.TimestepValues)
        
        self.representation= simple.Show(self.reader)
        simple.ColorBy(self.representation, ("POINTS", "Solid"))
        self.view = simple.GetActiveView()
        self.view.MakeRenderWindowInteractor(True)
        simple.Render(self.view)
    
    def download_from(self, fname):
        self.read_vtk_from(fname)
        self.ctrl.view_update()
            
    def load_data(self, **_kwargs):
        # CLI
        args, _ = self.server.cli.parse_known_args()
        if args.data:
            self.read_vtk_from(str(args.data))
        else:
            self.view = simple.CreateRenderView()

        # HTML
        with SinglePageLayout(self.server) as self.ui:
            self.ui.icon.click = self.ctrl.view_reset_camera
            self.ui.title.set_text("ParaView State Viewer")
            with self.ui.toolbar:
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

    @change("field_option")
    def on_field_option_change(self, field_option, **_kwargs):
        self.field_option = field_option
        self.representation= simple.Show(self.reader)
        simple.ColorBy(self.representation, ("POINTS", field_option))
        self.ctrl.view_update()
        print("Switching field option to ", field_option)
# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main():
    app = VTUFileReaderApp()
    app.server.start()

if __name__ == "__main__":
    main()
