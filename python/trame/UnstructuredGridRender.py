from trame.app import TrameApp
from trame.ui.vuetify3 import SinglePageLayout
from trame.widgets import vtk as trame_vtk, vuetify3 as v3
import vtk
import os
from paraview import simple

# Required for interactor initialization
from vtkmodules.vtkInteractionStyle import vtkInteractorStyleSwitch  # noqa

# Required for rendering initialization, not necessary for
# local rendering, but doesn't hurt to include it
import vtkmodules.vtkRenderingOpenGL2  # noqa

# Need to render an UnstructuredGrid using this tutorial:
# https://github.com/djeada/Vtk-Examples/blob/main/src/03_structures_and_datasets/unstructured_grid.py
def create_single_pyramid(x_offset=0.0, y_offset=0.0, z_offset=0.0):
    """
    Create a single pyramid cell.

    Pyramids are transition elements in hybrid meshes:
    - 5 vertices, 5 faces (1 quad + 4 triangular)
    - Connect quad-faced cells to triangle-faced cells
    - Essential for hex-tet transitions

    In CFD, pyramids are used to:
    - Bridge structured (hex) and unstructured (tet) regions
    - Avoid non-conformal interfaces
    - Enable smooth mesh transitions

    Args:
        x_offset, y_offset, z_offset: Position offset

    Returns:
        tuple: (vtkPoints, vtkPyramid, vtkUnstructuredGrid)
    """
    points = vtk.vtkPoints()
    # Pyramid vertices (square base + apex)
    points.InsertNextPoint(x_offset + 0.0, y_offset + 0.0, z_offset + 0.0)
    points.InsertNextPoint(x_offset + 1.0, y_offset + 0.0, z_offset + 0.0)
    points.InsertNextPoint(x_offset + 1.0, y_offset + 1.0, z_offset + 0.0)
    points.InsertNextPoint(x_offset + 0.0, y_offset + 1.0, z_offset + 0.0)
    points.InsertNextPoint(x_offset + 0.5, y_offset + 0.5, z_offset + 1.0)

    pyramid = vtk.vtkPyramid()
    for i in range(5):
        pyramid.GetPointIds().SetId(i, i)

    ugrid = vtk.vtkUnstructuredGrid()
    ugrid.SetPoints(points)
    ugrid.InsertNextCell(pyramid.GetCellType(), pyramid.GetPointIds())

    return points, pyramid, ugrid

# -----------------------------------------------------------------------------
# VTK pipeline
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Github Code - End
# -----------------------------------------------------------------------------

renderer = vtk.vtkRenderer()
renderWindow = vtk.vtkRenderWindow()
renderWindow.AddRenderer(renderer)

renderWindowInteractor = vtk.vtkRenderWindowInteractor()
renderWindowInteractor.SetRenderWindow(renderWindow)
renderWindowInteractor.GetInteractorStyle().SetCurrentStyleToTrackballCamera()

points, pyramid, ugrid = create_single_pyramid()

writer = vtk.vtkXMLUnstructuredGridWriter()
writer.SetInputDataObject(ugrid)
filepath = os.path.join(os.getcwd(),"out/vtk/pyramid.vtu")
writer.SetFileName(filepath)
writer.Write()

# Need to make a simple UnstructuredGrid and render it
mapper = vtk.vtkDataSetMapper()
mapper.SetInputData(ugrid)

actor = vtk.vtkActor()
actor.SetMapper(mapper)

renderer.AddActor(actor)
renderer.ResetCamera()

# -----------------------------------------------------------------------------
# Trame
# -----------------------------------------------------------------------------

class AppCone(TrameApp):
    def __init__(self, server=None):
        super().__init__(server)
        self._build_ui()

    def _build_ui(self):
        with SinglePageLayout(self.server) as self.ui:
            self.ui.title.set_text("Hello trame")

            with self.ui.content:
                with v3.VContainer(
                    fluid=True,
                    classes="pa-0 fill-height",
                ):
                    html_view = trame_vtk.VtkLocalView(renderWindow)

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main():
    app = AppCone()
    app.server.start()

if __name__ == "__main__":
    main()