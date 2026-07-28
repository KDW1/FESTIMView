import { FESTIMSim, genericSteps } from "../simulations";

export const gmshSimulation: FESTIMSim = {
  title: "Mesh with GMSH",
  description: `GMSH is a powerful mesh generation tool that can be used to create complex geometries for FESTIM simulations. It supports a wide range of shapes, physical labels, and CAD import/export, making it ideal for defining detailed 2D or 3D domains. In this tutorial, we will cover: using GMSH directly from a Python script, converting a GMSH model into a dolfinx mesh that can be used with FESTIM, and generating a mesh from a CAD geometry (e.g. STEP file)`,
  preCode: `import numpy as np
import os
import gmsh


# Initialize the GMSH API
gmsh.initialize()
gmsh.model.add("DFG 3D")

# Define geometry parameters (length L, breadth B, height H, cylinder radius r)
L, B, H, r = 2.5, 0.41, 0.41, 0.05

# Create the main channel as a rectangular box
channel = gmsh.model.occ.addBox(0, 0, 0, L, B, H)

# Create the obstacle cylinder inside the channel
cylinder = gmsh.model.occ.addCylinder(0.5, 0, 0.2, 0, B, 0, r)

# Subtract cylinder from channel to get the fluid region
fluid = gmsh.model.occ.cut([(3, channel)], [(3, cylinder)])
gmsh.model.occ.synchronize()

# Mark the fluid volume for later identification
volumes = gmsh.model.getEntities(dim=3)
fluid_marker = 11
gmsh.model.addPhysicalGroup(volumes[0][0], [volumes[0][1]], fluid_marker)
gmsh.model.setPhysicalName(volumes[0][0], fluid_marker, "Fluid volume")

# Identify and tag boundary surfaces based on their center of mass
surfaces = gmsh.model.occ.getEntities(dim=2)
inlet, outlet = None, None
walls, obstacles = [], []

inlet_marker, outlet_marker = 1, 3
wall_marker, obstacle_marker = 5, 7

for dim, tag in surfaces:
    com = gmsh.model.occ.getCenterOfMass(dim, tag)
    if np.allclose(com, [0, B / 2, H / 2]):
        gmsh.model.addPhysicalGroup(dim, [tag], inlet_marker)
        gmsh.model.setPhysicalName(dim, inlet_marker, "Fluid inlet")
        inlet = tag
    elif np.allclose(com, [L, B / 2, H / 2]):
        gmsh.model.addPhysicalGroup(dim, [tag], outlet_marker)
        gmsh.model.setPhysicalName(dim, outlet_marker, "Fluid outlet")
    elif np.isclose(com[2], 0) or np.isclose(com[1], B) or \
         np.isclose(com[2], H) or np.isclose(com[1], 0):
        walls.append(tag)
    else:
        obstacles.append(tag)

# Tag wall and obstacle surfaces
gmsh.model.addPhysicalGroup(2, walls, wall_marker)
gmsh.model.setPhysicalName(2, wall_marker, "Walls")
gmsh.model.addPhysicalGroup(2, obstacles, obstacle_marker)
gmsh.model.setPhysicalName(2, obstacle_marker, "Obstacle")

# Define mesh size field to refine near the obstacle
distance = gmsh.model.mesh.field.add("Distance")
gmsh.model.mesh.field.setNumbers(distance, "FacesList", obstacles)
resolution = r / 10
threshold = gmsh.model.mesh.field.add("Threshold")
gmsh.model.mesh.field.setNumber(threshold, "IField", distance)
gmsh.model.mesh.field.setNumber(threshold, "LcMin", resolution)
gmsh.model.mesh.field.setNumber(threshold, "LcMax", 20 * resolution)
gmsh.model.mesh.field.setNumber(threshold, "DistMin", 0.5 * r)
gmsh.model.mesh.field.setNumber(threshold, "DistMax", r)

# Optionally refine mesh near inlet
inlet_dist = gmsh.model.mesh.field.add("Distance")
gmsh.model.mesh.field.setNumbers(inlet_dist, "FacesList", [inlet])
inlet_thre = gmsh.model.mesh.field.add("Threshold")
gmsh.model.mesh.field.setNumber(inlet_thre, "IField", inlet_dist)
gmsh.model.mesh.field.setNumber(inlet_thre, "LcMin", 5 * resolution)
gmsh.model.mesh.field.setNumber(inlet_thre, "LcMax", 10 * resolution)
gmsh.model.mesh.field.setNumber(inlet_thre, "DistMin", 0.1)
gmsh.model.mesh.field.setNumber(inlet_thre, "DistMax", 0.5)

# Apply the minimal field combining both refinement regions
minimum = gmsh.model.mesh.field.add("Min")
gmsh.model.mesh.field.setNumbers(minimum, "FieldsList", [threshold, inlet_thre])
gmsh.model.mesh.field.setAsBackgroundMesh(minimum)

# Synchronize and generate 3D mesh
gmsh.model.occ.synchronize()
gmsh.model.mesh.generate(3)


# Ensure the output folder exists
os.makedirs("gmsh", exist_ok=True)

# Save the mesh in GMSH format for downstream use
gmsh.write("gmsh/mesh3D.msh")

from dolfinx.io import gmsh as gmshio
from mpi4py import MPI

model_rank = 0
mesh_data = gmshio.model_to_mesh(
    gmsh.model, MPI.COMM_WORLD, model_rank
)

mesh_data = gmshio.read_from_msh(
    "gmsh/mesh3D.msh", MPI.COMM_WORLD, 0, gdim=3
)

mesh = mesh_data.mesh
assert mesh_data.facet_tags is not None
facet_tags = mesh_data.facet_tags
facet_tags.name = "Facet markers"

assert mesh_data.cell_tags is not None
cell_tags = mesh_data.cell_tags
cell_tags.name = "Cell markers"

print(f"Cell tags: {np.unique(cell_tags.values)}")
print(f"Facet tags: {np.unique(facet_tags.values)}")`,
  steps: [
    genericSteps["problem"],
    // Mesh Sstep
    // Materials step
    // Domains step
    // Meshtag steps
    genericSteps["boundaryConditions"],
    genericSteps["temperature"],
    genericSteps["settings"],
    genericSteps["exports"],
    genericSteps["run"]
  ]
}