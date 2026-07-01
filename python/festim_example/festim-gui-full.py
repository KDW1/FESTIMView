import warnings

import dolfinx
import festim as F
import numpy as np
from mpi4py import MPI

if F.__version__ != "2.0b2.post2":
    warnings.warn(
        "This script template was calibrated against FESTIM 2.0b2.post2. "
        "Adjust section values if your FESTIM version differs.",
        stacklevel=2,
    )

# 1. Create empty problem
problem = F.HydrogenTransportProblemDiscontinuous()

# 2. Create mesh
nx = 20
ny = 20
coordinate_system = "cartesian"
lower_left = np.array([0.0, 0.0])
upper_right = np.array([1.0, 1.0])
cell_type = dolfinx.mesh.CellType.triangle

mesh_dolfinx = dolfinx.mesh.create_rectangle(
    MPI.COMM_WORLD, [lower_left, upper_right], [nx, ny], cell_type=cell_type
)
problem.mesh = F.Mesh(mesh_dolfinx, coordinate_system=coordinate_system)

# 3. Create materials
mat_1 = F.Material(name="mat_1", D_0=1.0, E_D=0.0, K_S_0=0.1, E_K_S=0.0)
mat_2 = F.Material(name="mat_2", D_0=0.1, E_D=0.0, K_S_0=0.5, E_K_S=0.0)

# 4. Create domains
eps = 0.001
volume_1 = F.VolumeSubdomain(id=1, material=mat_1, locator=lambda x: x[0] < 0.5 + eps)
volume_2 = F.VolumeSubdomain(id=2, material=mat_2, locator=lambda x: x[0] >= 0.5 - eps)

surface_1 = F.SurfaceSubdomain(id=3, locator=lambda x: np.isclose(x[0], 0.0))
surface_2 = F.SurfaceSubdomain(id=4, locator=lambda x: np.isclose(x[0], 1.0))

problem.subdomains = [volume_1, volume_2, surface_1, surface_2]

problem.surface_to_volume = {
    surface_1: volume_1,
    surface_2: volume_2,
}

interface_1 = F.Interface(id=5, subdomains=[volume_1, volume_2], penalty_term=100.0)
problem.interfaces = [interface_1]

# 5a. Create species
H = F.Species(name="H", mobile=True)
H.subdomains = [volume_1, volume_2]
H_trapped = F.Species(name="H_trapped", mobile=False)
H_trapped.subdomains = [volume_1, volume_2]
empty_trap = F.Species(name="empty_trap", mobile=False)
empty_trap.subdomains = [volume_1, volume_2]
problem.species = [H, H_trapped, empty_trap]

# 5b. Create initial conditions
ic_1 = F.InitialConcentration(species=empty_trap, value=1.0, volume=volume_1)
problem.initial_conditions = [ic_1]

# 5c. Create reactions
reac_1 = F.Reaction(
    reactant=[H, empty_trap],
    product=[H_trapped],
    k_0=0.05,
    E_k=0.0,
    p_0=0.1,
    E_p=0.0,
    volume=volume_1,
)
problem.reactions = [reac_1]

# 6. Create boundary conditions
bc_1 = F.FixedConcentrationBC(subdomain=surface_1, value=1.0, species=H)
bc_2 = F.FixedConcentrationBC(subdomain=surface_2, value=0.0, species=H)
problem.boundary_conditions = [bc_1, bc_2]

# 5c. Create particle sources
source_1 = F.ParticleSource(species=H, volume=volume_1, value=lambda t: 3 if t < 0.5 else 0.0)
problem.sources = [source_1]

# 7. Temperature
problem.temperature = 600.0  # K

# 8. Settings
problem.settings = F.Settings(
    atol=1e-10, rtol=1e-10, transient=True,
    stepsize=0.05, final_time=2.0
)

# 9. Exports
vtx_export_1 = F.VTXSpeciesExport(
    filename="out/field_export.bp",
    field=problem.species,
    subdomain=volume_1,
)
concentration_field_exports = [vtx_export_1]

surface_quantity_1 = F.SurfaceFlux(
    field=H,
    surface=surface_1,
)
volume_quantity_1 = F.TotalVolume(
    field=H,
    volume=volume_1,
)
derived_quantities = [surface_quantity_1, volume_quantity_1]

problem.exports = concentration_field_exports + derived_quantities

# 10. Run

# initialise and run the problem
problem.initialise()
problem.run()
