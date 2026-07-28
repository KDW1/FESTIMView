# Adapted from the work of Will Dunklin @willdunklin, https://github.com/willdunklin
# from the repository, https://github.com/festim-dev/festim-gui

import asyncio
from pathlib import Path

from paraview import simple
from trame.app import TrameApp, asynchronous
from trame.decorators import change
from trame.ui.vuetify3 import SinglePageLayout
from trame.widgets import html, iframe, client
from trame.widgets import paraview as pvw
from trame.widgets import vuetify3 as v3

class PostProcessing(TrameApp):
    DEFAULT_FILE_PATH = "out/field_export.bp"
    DEFAULT_COLOR_PRESET = "Fast"
    
    file = None
    async def child_receive_msg(self, data):
            print("Received message: ", data)
            # data = json.loads(data)
            print("Data is: ", data)
            action = data.get("action", None)
            match action:
                case "downloadData":
                    filepath = data.get("filepath", self.DEFAULT_FILE_PATH)
                    self.file = filepath
                    self._setup_pv(filepath)
                    self._build_ui("main")
                    if self.file and self.ctx.view:
                        self.ctx.view.reset_camera()
                        self.ctx.view.update()
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
    
    def __init__(self, server=None, template_name="post-processing"):
        super().__init__(server)

        pvw.initialize(self.server)
        v3.initialize(self.server)

        # initial_file = self._resolve_latest_file()
        # TODO: Pass in the Paraview file as a matter of iframe communication
        # TODO: Add iframe communication to communicate the file address
        self._build_ui("main")
        if self.file and self.ctx.view:
            self.ctx.view.reset_camera()
            self.ctx.view.update()

    # def _resolve_latest_file(self):
    #     latest_run = read_latest_run_record()
    #     if latest_run is None:
    #         return None

    #     vtx_paths = latest_run.get("vtx_paths") or []
    #     if not vtx_paths and latest_run.get("output_dir"):
    #         vtx_paths = find_vtx_dirs(Path(latest_run["output_dir"]))

    #     return str(Path(vtx_paths[0]).resolve()) if vtx_paths else None

    def _setup_pv(self, file_to_load):
        self.times = []
        self.state.pv_time_idx_max = -1
        self.state.pv_time_controls_width = self._time_controls_width(0)
        self.animation_scene = simple.GetAnimationScene()

        self.reader = None
        self.representation = None
        self.view = simple.GetActiveViewOrCreate("RenderView")
        self.view.Set(
            OrientationAxesVisibility=1,
            Background=[0.12, 0.12, 0.12],
        )

        if file_to_load:
            self.load_file(file_to_load)
            print("Loaded file: ", file_to_load)

    def _time_controls_width(self, time_count):
        return f"min(calc(100vw - 2rem), calc({max(time_count, 1)} * 5px + 24rem))"

    def load_file(self, file_path):
        file_path = Path(file_path).resolve()
        if not file_path.exists():
            if self.representation is not None:
                self.representation.Visibility = 0
            return

        if self.reader is None:
            self.reader = simple.ADIOS2VTXReader(FileName=str(file_path))
            self.representation = simple.Show(self.reader, self.view)
        else:
            self.reader.FileName = str(file_path)
            simple.ReloadFiles(self.reader)

        self.reader.UpdatePipeline()
        data_info = self.reader.GetDataInformation()
        options = []
        for data_set, location in (
            (data_info.GetPointDataInformation(), "POINTS"),
            (data_info.GetCellDataInformation(), "CELLS"),
        ):
            for index in range(data_set.GetNumberOfArrays()):
                array = data_set.GetArrayInformation(index)
                if array is None or not array.GetName():
                    continue
                name = array.GetName()
                options.append({"title": name, "value": f"{location}:::{name}"})

        if self.reader.TimestepValues:
            self.times = self.reader.TimestepValues
            self.state.pv_time_idx_max = len(self.times) - 1
            self.state.pv_time_idx = 0
            self.state.pv_time_controls_width = self._time_controls_width(len(self.times))

        self.state.pv_color_options = options
        # self.state.pv_color_preset_options = simple.color.ListColorPresetNames()
        
        # Instead of the full range of color presets I copy the default ones from Paraview
        self.state.pv_color_preset_options = [
            "Fast",
            "Turbo",
            "Cool to Warm",
            "Cool to Warm (Extended)",
            "Black Body Radiation",
            "X Ray",
            "Inferno",
            "Black, Blue and White",
            "Blue Orange (divergent)",
            "Viridis",
            "Cold and Hot",
            "Linear Green (Gr4L)",
            "Rainbow Desaturated",
            "Blue - Green - Orange",
            "Rainbow Uniform",
            "Yellow - Gray - Blue"
        ]
        self.representation.Visibility = 1
        self.representation.SetScalarBarVisibility(self.view, True)

        self.view.ResetCamera()
        if self.ctx.view:
            self.ctx.view.reset_camera()

    def reset_color_range(self):
        self.representation.RescaleTransferFunctionToDataRange(True, False)
        self.ctx.view.update()

    @change("pv_time_idx")
    def _on_time_change(self, pv_time_idx, **_):
        if not self.times:
            return

        if pv_time_idx < len(self.times):
            time_value = self.times[pv_time_idx]
            self.state.time_value = f"{time_value:.3f}"
            self.animation_scene.AnimationTime = time_value

        self.ctx.view.update()

    @change("pv_color_by")
    def _on_color_by(self, pv_color_by, **_):
        if self.representation is None:
            return

        if pv_color_by is None:
            self.representation.ColorBy(("POINTS", None))
        else:
            self.representation.ColorBy(pv_color_by.split(":::"))

        if self.ctx.view:
            self.ctx.view.update()

    @change("pv_color_preset")
    def _on_color_preset(self, pv_color_preset, **_):
        if self.representation is None:
            return

        if pv_color_preset is None:
            for pv_color_option in self.state.pv_color_options:
                title, value = pv_color_option.values()
                color_function_name = value.split(":::")[1]
                color_tf = simple.GetColorTransferFunction(color_function_name)
                color_tf.ApplyPreset(self.DEFAULT_COLOR_PRESET, True)
        else:
            for pv_color_option in self.state.pv_color_options:
                title, value = pv_color_option.values()
                color_function_name = value.split(":::")[1]
                color_tf = simple.GetColorTransferFunction(color_function_name)
                color_tf.ApplyPreset(pv_color_preset, True)
            
        if self.ctx.view:
            self.ctx.view.update()

    @change("pv_play")
    def _on_play(self, pv_play, **_):
        if pv_play:
            asynchronous.create_task(self._animate())

    def view_action(self, action):
        getattr(self.view, action)()
        self.ctx.view.reset_camera()

    async def _animate(self):
        while self.state.pv_play:
            with self.state:
                if self.state.pv_time_idx < self.state.pv_time_idx_max:
                    self.state.pv_time_idx += 1
                else:
                    self.state.pv_time_idx = 0
            await asyncio.sleep(0.1)

    def _build_ui(self, template_name):
        self.state.time_value = ""
        if self.file:
            with SinglePageLayout(
                self.server, template_name=template_name, full_height=True
            ) as self.ui:
                with self.ui.content:
                    with v3.VContainer(
                        fluid=True,
                        classes="pa-0 h-100",
                    ):
                        with html.Div(
                            style="position: relative; width: 100%; height: 100%;"
                        ):
                            pvw.VtkRemoteView(
                                self.view,
                                interactive_ratio=1,
                                ctx_name="view",
                                style="width: 100%; height: 100%;",
                            )
                            # with html.Div(
                            #     style=(
                            #         "{"
                            #         " position: 'absolute',"
                            #         " left: '1rem',"
                            #         " right: '1rem',"
                            #         " bottom: '1rem',"
                            #         " display: 'flex',"
                            #         " justifyContent: 'center',"
                            #         " zIndex: 10,"
                            #         " pointerEvents: 'none'"
                            #         "}",
                            #     )
                            # ):
                            #     with v3.VCard(
                            #         elevation=4,
                            #         style=(
                            #             "{"
                            #             " backgroundColor: '#ffffff',"
                            #             " width: pv_time_controls_width,"
                            #             " maxWidth: 'calc(100vw - 2rem)',"
                            #             " pointerEvents: 'auto'"
                            #             "}",
                            #         ),
                            #     ):
                            #         with v3.VCardText(classes="px-2 py-1"):
                            #             with html.Div(classes="d-flex align-center ga-0"):
                            #                 v3.VBtn(
                            #                     icon="mdi-skip-previous",
                            #                     variant="plain",
                            #                     click="pv_time_idx = 0",
                            #                     density="compact",
                            #                     disabled=("pv_time_idx <= 0", True),
                            #                 )
                            #                 v3.VBtn(
                            #                     icon="mdi-chevron-left",
                            #                     variant="plain",
                            #                     click="pv_time_idx = Math.max(pv_time_idx - 1, 0)",
                            #                     density="compact",
                            #                     disabled=("pv_time_idx <= 0", True),
                            #                 )
                            #                 v3.VBtn(
                            #                     icon="mdi-stop",
                            #                     variant="plain",
                            #                     click="pv_play=false",
                            #                     v_if=("pv_play", False),
                            #                     density="compact",
                            #                 )
                            #                 v3.VBtn(
                            #                     icon="mdi-play",
                            #                     variant="plain",
                            #                     click="pv_play=true",
                            #                     v_else=True,
                            #                     density="compact",
                            #                 )
                            #                 v3.VBtn(
                            #                     icon="mdi-chevron-right",
                            #                     variant="plain",
                            #                     click="pv_time_idx = Math.min(pv_time_idx + 1, pv_time_idx_max)",
                            #                     density="compact",
                            #                     disabled=(
                            #                         "pv_time_idx < 0 || pv_time_idx >= pv_time_idx_max",
                            #                         True,
                            #                     ),
                            #                 )
                            #                 v3.VBtn(
                            #                     icon="mdi-skip-next",
                            #                     variant="plain",
                            #                     click="pv_time_idx = pv_time_idx_max",
                            #                     density="compact",
                            #                     disabled=(
                            #                         "pv_time_idx < 0 || pv_time_idx >= pv_time_idx_max",
                            #                         True,
                            #                     ),
                            #                 )
                            #                 with html.Div(classes="flex-grow-1"):
                            #                     v3.VSlider(
                            #                         v_model=("pv_time_idx", -1),
                            #                         min=0,
                            #                         step=1,
                            #                         max=("pv_time_idx_max", -1),
                            #                         hide_details=True,
                            #                         density="comfortable",
                            #                         disabled=("pv_time_idx_max < 0", True),
                            #                         classes="px-2",
                            #                     )
                            #                 html.Div(
                            #                     "{{ pv_time_idx_max >= 0 ? '(' + (pv_time_idx + 1) + ' / ' + (pv_time_idx_max + 1) + ')' : '(0 / 0)' }}",
                            #                     classes="text-body-2 text-no-wrap pr-2",
                            #                 )
                            #                 html.Div(
                            #                     "t = {{ time_value }}",
                            #                     classes="text-body-2 text-no-wrap",
                            #                 )

                with self.ui.toolbar.clear() as toolbar:
                    toolbar.density = "comfortable"
                    v3.VSelect(
                        label="Color By",
                        v_model=("pv_color_by", None),
                        items=("pv_color_options", []),
                        density="compact",
                        hide_details=True,
                        variant="outlined",
                        style="max-width: 250px;",
                        classes="mx-2",
                    )
                    v3.VSelect(
                        label="Color Preset",
                        v_model=("pv_color_preset", "Fast"),
                        items=("pv_color_preset_options", []),
                        density="compact",
                        hide_details=True,
                        variant="outlined",
                        style="max-width: 250px;",
                        classes="mx-2",
                    )

                    with html.Div(classes="d-flex ga-2 mx-2"):
                        v3.VBtn(
                            icon="mdi-arrow-expand-horizontal",
                            click=self.reset_color_range,
                            classes="rounded",
                            density="compact",
                        )
                        v3.VBtn(
                            icon="mdi-axis-x-arrow",
                            click=(self.view_action, "['ResetActiveCameraToPositiveX']"),
                            classes="rounded",
                            density="compact",
                        )
                        v3.VBtn(
                            icon="mdi-axis-y-arrow",
                            click=(self.view_action, "['ResetActiveCameraToPositiveY']"),
                            classes="rounded",
                            density="compact",
                        )
                        v3.VBtn(
                            icon="mdi-axis-z-arrow",
                            click=(self.view_action, "['ResetActiveCameraToPositiveZ']"),
                            classes="rounded",
                            density="compact",
                        )
                        v3.VBtn(
                            icon="mdi-crop-free",
                            click=self.ctx.view.reset_camera,
                            classes="rounded",
                            density="compact",
                        )
        else:
            with SinglePageLayout(self.server) as self.ui:
                        comm = iframe.Communicator(
                            event_names=["parent_to_child"],
                            parent_to_child=(self.child_receive_msg, "[$event]"),
                        )
                        self.ctrl.child_post_message = comm.post_message
                        
                        self.ui.icon.click = self.ctrl.view_reset_camera
                        self.ui.title.set_text("Festim PostProcessor")
            
                        with self.ui.content:
                            with v3.VContainer(fluid=True, classes="pa-0 fill-height"):
                                client.Loading("Loading state")
            
if __name__ == "__main__":
    app = PostProcessing()
    app.server.start()
