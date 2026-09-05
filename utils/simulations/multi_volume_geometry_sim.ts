import { FESTIMSim, FESTIMStep, genericSteps } from "../simulations";

const domainsStep: FESTIMStep = {
  title: "4. Domains",
  settings: [
    {
      title: "Volume Subdomains",
      type: "volume",
      name: "volumes",
      itemName: "volume",
      propertiesToExclude: ["locator"],
      list: true
    },
    {
      title: "Surface Subdomains",
      type: "surface",
      name: "surfaces",
      itemName: "surface",
      propertiesToExclude: ["locator"],
      list: true
    },
    {
      title: "Interfaces",
      type: "interface",
      name: "interfaces",
      itemName: "interface",
      list: true
    }
  ],
  recipe: `# 4. Create domains
$volumes--{*volume.variable*}=F.VolumeSubdomain(id={*volume.id*}, material={*volume.material*})$

$surfaces--{*surface.variable*}=F.SurfaceSubdomain(id={*surface.id*})$

@problem--{*problem_variable*}@.subdomains = [$volumes--{*volume.variable*}, $$surfaces--{*surface.variable*}, $]

@problem--{*problem_variable*}@.surface_to_volume = {
$surfaces-- {*surface.variable*} : {*surface.linked_volume_variable*}, $
}

$interfaces--{*interface.variable*}=F.Interface(id={*interface.id*}, subdomains=[{*interface.subdomains*}], penalty_term={*interface.penalty_term*})$
@problem--{*problem_variable*}@.interfaces = [$interfaces--{*interface.variable*},$]
`
}

export const multiVolumeGeometrySimulation : FESTIMSim = {
    title: "Meshing a Multi-Volume Geometry",
    description: `This section discusses how to mesh multiple volumes in GMSH, which users may need to do for a multi-material hydrogen transport problem in FESTIM. We use CadQuery, a powerful Python-based library that can build 3D parametric models. See its documentation to learn more.`,
    steps: [
      {
        title: "GMSH Calculations",
        description: ".MSH Upload",
        fileAddress: "filename",
        isFileContext: true,
        settings: [
            {
                title: "File Name",
                name: "filename",
                type: "string"
            },
            {
                title: ".MSH File Upload",
                name: "file",
                type: "file"
            }
        ],
        recipe: `from dolfinx.io import gmsh as gmshio
from mpi4py import MPI
import festim as F

mesh_data = gmshio.read_from_msh(
"{*filename*}", MPI.COMM_WORLD, 0, gdim=3
)
mesh = mesh_data.mesh
facet_tags = mesh_data.facet_tags
facet_tags.name = "Facet markers"

cell_tags = mesh_data.cell_tags
cell_tags.name = "Cell markers"`
      },    
        {
        title: "Problem",
        name: "problem",
        description: "Create the root FESTIM problem object.",
        settings: [
          {
            title: "Python variable",
            name: "problem_variable",
            type: "string"
          }
        ],
        recipe: `import festim as F
        
# Create empty problem\n{*problem_variable*}=F.HydrogenTransportProblemDiscontinuous()`
      },
        {
            title: "Mesh",
            name: "mesh",
            description: "This accesses the mesh variable that we defined in the previous step",
            settings: [],
            recipe: `@problem--{*problem_variable*}@.mesh = F.Mesh(mesh)`
        },
        {
            title: "Materials",
            name: "materials",
            settings: [
                {
                    title: "Materials",
                    name: "materials",
                    type: "material",
                    itemName: "material",
                    list: true
                }
            ],
            recipe: `$materials--{*material.variable*} = F.Material(name="{*material.name*}", D_0={*material.D_0*}, E_D={*material.E_D*}, K_S_0={*material.K_S_0*}, E_K_S={*material.E_K_S*})$`
        },
        domainsStep,
        {
            title: "Mesh Tags",
            description: "These are predefined mesh tags which were defined from data extracted from the mesh we made in gmsh.",
            name: "meshtags",
            settings: [],
            recipe: `@problem--{*problem_variable*}@.facet_meshtags = facet_tags
@problem--{*problem_variable*}@.volume_meshtags = cell_tags`
        },
        {
        title: "Species",
        name: "species",
        settings: [
          {
            title: "Species",
            type: "species",
            name: "specieses",
            propertiesToExclude: ["mobile"],
            list: true
          }
        ],
        recipe:
          `# Create species
$specieses--{*species.variable*} = F.Species(name="{*species.name*}", subdomains=[{*species.subdomains*}])$
    
@problem--{*problem_variable*}@.species = [$specieses--{*species.variable*}, $]`
      },
        genericSteps["boundaryConditions"],
        genericSteps["temperature"],
        {
        title: "Settings",
        name: "settings",
        settings: [
          {
            title: "atoi",
            type: "number",
            name: "atoi"
          },
          {
            title: "rtoi",
            type: "number",
            name: "rtoi"
          },
          {
            title: "Transient",
            type: "boolean",
            name: "transient"
          },
        ],
        recipe: `# Settings
@problem--{*problem_variable*}@.settings = F.Settings(
    atol={*atoi*}, rtol={*rtoi*}, transient={*transient*}
)`
      },
        {
          title: "Exports",
          name: "exports",
          exporting: true,
          exportAddress: "vtx_exports$vtx_export.filename",
          settings: [
          {
            title: "Field export list variable",
            name: "field_export_list_variable",
            type: "string"
          },
          {
            title: "VTX Species Exports",
            type: "vtx_export",
            name: "vtx_exports",
            propertiesToExclude: ["field_expression"],
            list: true
          },],
          recipe: `# Exports
$vtx_exports--{*vtx_export.variable*} = F.VTXSpeciesExport(
  filename=f"{*vtx_export.filename*}",
  field=@problem--{*problem_variable*}.species@,
  subdomain={*vtx_export.volume_subdomain_variable*},
)$

{*field_export_list_variable*} = [$vtx_exports--{*vtx_export.variable*}, $]

@problem--{*problem_variable*}@.exports = {*field_export_list_variable*}`
    
        },
        genericSteps["run"]
      ],
}