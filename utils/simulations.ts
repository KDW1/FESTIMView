// TODO: For list expression need: 1) Better separator notation, 2) New format for enclosing expressions

// Setting in a step of a FESTIM simulation
export type FESTIMSetting = {
  title: string;
  type: string; // "string" | "number" | "boolean" | "enum" | "..." 
  description?: string;
  list?: boolean;
  itemName?: string; // Generic name for element in list
  options?: string[]; // Options for enum type
  name?: string;
  defaultValue?: string;
}

// Step in a FESTIM simulation
export type FESTIMStep = {
  title: string;
  name: string;
  description?: string;
  settings: FESTIMSetting[];
  recipe?: string; // Recipe for assembling Python code
  exporting?: boolean;
  exportAddress?: string; // Where the filepath for the exported item can be found
}

// FESTIM simulation, composed of multiple steps
export type FESTIMSim = {
  title: string;
  description?: string;
  steps: FESTIMStep[];
  preCode?: string;
  postCode?: string;
  imageUrl?: string;
  imageCaption?: string;
}

// Dictionary of FESTIM classes
// FESTIM classes are composed of simpler data types, FESTIM settings
export type ClassDictionary = {
  [key: string]: FESTIMSetting[]
}


export const customClasses: ClassDictionary = {
  "person": [
    {
      title: "Name",
      type: "string",
      name: "name",
    },
    {
      title: "Age",
      type: "number",
      name: "age"
    },
    {
      title: "Companion",
      type: "enum",
      name: "companion",
      options: [
        "Radioactive Spider (Earth-42)",
        "Momo",
        "Rocky",
        "BB-8"
      ]
    }
  ],
  "material": [
    {
      title: "Variable",
      description: "variable name",
      name: "variable",
      type: "string"
    },
    {
      title: "Name",
      description: "the name of the material",
      name: "name",
      type: "string"
    },
    {
      title: "D_0",
      description: "the pre-exponential factor of the diffusion coefficient (m2/s)",
      name: "D_0",
      type: "number"
    },
    {
      title: "E_D",
      description: "the activation energy of the diffusion coefficient (eV)",
      name: "E_D",
      type: "number"
    },
    {
      title: "K_S_0",
      description: "the pre-exponential factor of the solubility coefficient (H/m3/Pa0.5)",
      name: "K_S_0",
      type: "number"
    },
    {
      title: "E_K_S",
      description: "the activation energy of the solubility coeficient (eV)",
      name: "E_K_S",
      type: "number"
    },
  ],
  "volume": [
    {
      title: "Variable",
      name: "variable",
      description: "variable name",
      type: "string"
    },
    {
      title: "ID",
      name: "id",
      description: "the id of the volume subdomain",
      type: "number"
    },
    {
      title: "Material Variable",
      name: "material",
      description: "the material assigned to the subdomain",
      type: "string"
    },
    {
      title: "Locator Expression",
      name: "locator",
      description: "locator function",
      type: "string"
    }
  ],
  "surface": [
    {
      title: "Variable",
      description: "variable name",
      type: "string",
      name: "variable"
    },
    {
      title: "ID",
      description: "the id of the surface subdomain",
      type: "string",
      name: "id"
    },
    {
      title: "Locator Expression",
      description: "a callable function that locates the boundary facets of the subdomain",
      type: "string",
      name: "locator"
    },
    {
      title: "Linked Volume Variable",
      type: "string",
      name: "linked_volume_variable"
    }
  ],
  "interface": [
    {
      title: "Variable",
      name: "variable",
      type: "string",
      description: "variable name"
    },
    {
      title: "ID",
      name: "id",
      type: "number",
      description: "tag of the interface subdomain in the parent mesh tags."
    },
    {
      title: "Subdomains",
      name: "subdomains",
      type: "string",
      description: "the two subdomains sharing this interface, (comma separated values)"
    },
    {
      title: "Penalty Term",
      name: "penalty_term",
      type: "number",
      description: "penalty parameter for the interface formulation"
    }
  ],
  "species": [
    {
      title: "Variable",
      description: "variable name",
      type: "string",
      name: "variable"
    },
    {
      title: "Name",
      description: "a name given to the species",
      type: "string",
      name: "name"
    },
    {
      title: "Mobile",
      description: "whether a species is mobile or not",
      type: "boolean",
      name: "mobile"
    },
    {
      title: "Subdomains",
      description: "the volume subdomain where the species is (comma-separated variables)",
      type: "string",
      name: "subdomains"
    }
  ],
  "surface_quantity": [
    {
      title: "Variable",
      type: "string",
      name: "variable",
      description: "variable name"
    },
    {
      title: "Quantity Type",
      type: "enum",
      name: "quantity_type",
      options: [
        "SurfaceFlux",
        "TotalSurface",
        "AverageSurface",
        "MinimumSurface",
        "MaximumSurface"
      ]
    },
    {
      title: "Field Expression",
      type: "string",
      name: "field_expression",
    },
    {
      title: "Surface Variable",
      type: "string",
      name: "surface_variable"
    }
  ],
  "volume_quantity": [
    {
      title: "Variable",
      type: "string",
      name: "variable",
      description: "variable name"
    },
    {
      title: "Quantity Type",
      type: "enum",
      name: "quantity_type",
      options: [
        "TotalVolume",
        "AverageVolume",
        "MaximumVolume",
        "MinimumVolume"
      ]
    },
    {
      title: "Field Expression",
      type: "string",
      name: "field_expression",
    },
    {
      title: "Volume Variable",
      type: "string",
      name: "volume_variable"
    }
  ],
  "vtx_export": [
    {
      title: "Variable",
      type: "string",
      name: "variable",
      description: "variable name"
    },
    {
      title: "Volume Subdomain Variable",
      type: "string",
      name: "volume_subdomain_variable"
    },
    {
      title: "Filename",
      type: "string",
      name: "filename"
    },
    {
      title: "Field Expression",
      type: "string",
      name: "field_expression"
    }
  ],
  "concentration": [
    {
      title: "Variable",
      description: "variable name",
      type: "string",
      name: "variable"
    },
    {
      title: "Species Variable",
      description: "the species to which the condition is applied",
      type: "string",
      name: "species_variable"
    },
    {
      title: "Value",
      description: "the value of the initial concentration of a given species",
      type: "number",
      name: "value"
    },
    {
      title: "Volume Variable",
      description: "the volume subdomain where the initial condition is applied",
      type: "string",
      name: "volume_variable"
    }
  ],
  "reaction": [
    {
      title: "Variable",
      description: "variable name",
      type: "string",
      name: "variable"
    },
    {
      title: "Reactants",
      description: "the reactants (comma-separated values)",
      type: "string",
      name: "reactants"
    },
    {
      title: "Product",
      description: "the product",
      type: "string",
      name: "product"
    },
    {
      title: "k_0",
      description: "the forward rate constant pre-exponential factor",
      type: "number",
      name: "k_0"
    },
    {
      title: "E_k",
      description: "the forward rate constant activation energy",
      type: "number",
      name: "E_k"
    },
    {
      title: "p_0",
      description: "the backward rate constant pre-exponential factor",
      type: "number",
      name: "p_0"
    },
    {
      title: "E_p",
      description: "the backward rate constant activation energy",
      type: "number",
      name: "E_p"
    },
    {
      title: "Volume",
      description: "the volume subdomain where the reaction takes place",
      type: "string",
      name: "volume_variable"
    }
  ],
  // Fixed Concentration Boundary Condition
  "fixed_bc": [
    {
      title: "Variable",
      description: "variable name",
      type: "string",
      name: "variable",
    },
    {
      title: "Subdomain",
      description: "the surface subdomain where the boundary condition is applied",
      type: "string",
      name: "surface_subdomain_variable"
    },
    {
      title: "Value",
      description: "the value of the boundary condition. It can be a function of space and/or time",
      type: "number",
      name: "value"
    },
    {
      title: "Species",
      description: "the name of the species",
      type: "string",
      name: "species_variable"
    }
  ],
  "source": [
    {
      title: "Variable",
      description: "variable name",
      name: "variable",
      type: "string"
    },
    {
      title: "Species",
      description: "the species to which the source is applied",
      name: "species_variable",
      type: "string"
    },
    {
      title: "Volume",
      description: "the volume subdomains where the source is applied",
      name: "volume_variable",
      type: "string"
    },
    {
      title: "Value Expression",
      description: "the value of the source",
      name: "value",
      type: "string"
    }
  ]
}

const exampleStep: FESTIMStep = {
  title: "Python Recipe Example",
  description: "Simple demonstration of how the Python recipe works",
  settings: [
    {
      title: "Favorite Movie",
      name: "favorite_movie",
      type: "string",
      list: false
    },
    {
      title: "Person",
      name: "person",
      type: "person",
      list: false
    },
    {
      title: "Friends",
      name: "friends",
      itemName: "friend",
      type: "person",
      list: true
    }
  ],
  recipe:
    `favorite_movie="{*favorite_movie*}"
person={
  "name": "{*person.name*}",
  "age": {*person.age*},
  "companion": "{*person.companion*}"
}
person["friends"] = [$friends--{
  "name": "{*friend.name*}",
  "age": {*friend.age*},
  "companion": "{*friend.companion*}"
},$]
print(person)
`
}

// const testingPageVariablesStep : FESTIMStep = {
//   title: "Other Page Variables",
//   description: "This is a test for accessing the variables associated with other steps",
//   recipe: `problem_name = @problem--{*problem_variable*}@
//   @materials--$materials--{*material.name*}, $@
//   `,
//   settings: []
// }

const problemStep: FESTIMStep = {
  title: "1. Problem",
  name: "problem",
  description: "Create the root FESTIM problem object.",
  settings: [
    {
      title: "Python variable",
      name: "problem_variable",
      type: "string"
    },
    {
      title: "Problem Type",
      type: "enum",
      name: "problem_type",
      options: [
        "HydrogenTransportProblemDiscontinuous",
        "HydrogenTransportProblem"
      ]
    }
  ],
  recipe: "#1 Create empty problem\n{*problem_variable*}=F.{*problem_type*}()"
}

const meshStep: FESTIMStep = {
  title: "2. Mesh",
  settings: [
    {
      title: "dolfinx mesh variable",
      name: "dolfinx_mesh_variable",
      type: "string"
    },
    {
      title: "nx",
      name: "nx",
      type: "number"
    },
    {
      title: "ny",
      type: "number"
    },
    {
      title: "xmin",
      type: "number"
    },
    {
      title: "xmax",
      type: "number"
    },
    {
      title: "ymin",
      type: "number"
    },
    {
      title: "ymax",
      type: "number"
    },
    {
      title: "Coordinate system",
      name: "coordinate_system",
      type: "enum",
      options: [
        "cartesian",
        "cylindrical",
        "spherical"
      ]
    },
    {
      title: "Cell type",
      name: "cell_type",
      type: "enum",
      options: [
        "triangle",
        "quadrilateral"
      ]
    }
  ],
  recipe: `# 2. Create mesh
# here we create a 2D rectangular mesh.
nx = {*nx*}
ny = {*ny*}

coordinate_system = "{*coordinate_system*}"

lower_left = np.array([{*xmin*}, {*ymin*}])
upper_right = np.array([{*xmax*}, {*ymax*}])
cell_type = dolfinx.mesh.CellType.{*cell_type*}

{*dolfinx_mesh_variable*} = dolfinx.mesh.create_rectangle(
    MPI.COMM_WORLD, [lower_left, upper_right], [nx, ny], cell_type=cell_type
)
@problem--{*problem_variable*}@.mesh = F.Mesh({*dolfinx_mesh_variable*}, coordinate_system=coordinate_system)`
}

const materialsStep: FESTIMStep = {
  title: "3. Materials",
  name: "materials",
  settings: [
    {
      title: "Materials",
      name: "materials",
      type: "material",
      itemName: "material",
      list: true,
    }
  ],
  recipe: `# 3. Create materials
$materials--{*material.variable*} = F.Material(name="{*material.name*}", D_0={*material.D_0*}, E_D={*material.E_D*}, K_S_0={*material.K_S_0*}, E_K_S={*material.E_K_S*})$`
}

const domainsStep: FESTIMStep = {
  title: "4. Domains",
  settings: [
    {
      title: "epsilon_helper_variable",
      type: "number",
    },
    {
      title: "Volume Subdomains",
      type: "volume",
      name: "volumes",
      itemName: "volume",
      list: true
    },
    {
      title: "Surface Subdomains",
      type: "surface",
      name: "surfaces",
      itemName: "surface",
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
eps = {*epsilon_helper_variable*}

$volumes--{*volume.variable*}=F.VolumeSubdomain(id={*volume.id*}, material={*volume.material*}, locator={*volume.locator*})$

$surfaces--{*surface.variable*}=F.SurfaceSubdomain(id={*surface.id*}, locator={*surface.locator*})$

@problem--{*problem_variable*}@.subdomains = [$volumes--{*volume.variable*}, $$surfaces--{*surface.variable*}, $]

@problem--{*problem_variable*}@.surface_to_volume = {
$surfaces-- {*surface.variable*} : {*surface.linked_volume_variable*}, $
}

$interfaces--{*interface.variable*}=F.Interface(id={*interface.id*}, subdomains=[{*interface.subdomains*}], penalty_term={*interface.penalty_term*})$
@problem--{*problem_variable*}@.interfaces = [$interfaces--{*interface.variable*},$]
`
}

const speciesStep: FESTIMStep = {
  title: "5a. Species",
  settings: [
    {
      title: "Species",
      type: "species",
      name: "specieses",
      list: true
    }
  ],
  recipe:
    `# 5a. Create species
$specieses--{*species.variable*} = F.Species(name="{*species.name*}", mobile={*species.mobile*})
{*species.variable*}.subdomains = [{*species.subdomains*}]
$

@problem--{*problem_variable*}@.species = [$specieses--{*species.variable*}, $]`
}

const initialConditionsStep: FESTIMStep = {
  title: "5b. Initial Conditions",
  settings: [
    {
      title: "Initial Concentrations",
      type: "concentration",
      name: "concentrations",
      list: true
    }
  ],
  recipe: `# 5b. Create initial conditions
# at t=0, c_empty_trap = 1 in volume 1
$concentrations--{*concentration.variable*} = F.InitialConcentration(species={*concentration.species_variable*}, value={*concentration.value*}, volume={*concentration.volume_variable*})$
@problem--{*problem_variable*}@.initial_conditions = [$concentrations--{*concentration.variable*}, $]

# NOTE by default other ICs are set to zero`
}

const reactionsStep: FESTIMStep = {
  title: "5c. Reactions",
  settings: [
    {
      title: "Reactions",
      type: "reaction",
      name: "reactions",
      list: true
    }
  ],
  recipe: `# 5c. Create reactions
# H + empty_trap <-> H_trapped

$reactions--{*reaction.variable*} = F.Reaction(
    reactant=[{*reaction.reactants*}],
    product=[{*reaction.product*}],
    k_0={*reaction.k_0*},
    E_k={*reaction.E_k*},
    p_0={*reaction.p_0*},
    E_p={*reaction.E_p*},
    volume={*reaction.volume_variable*},
)$

@problem--{*problem_variable*}@.reactions = [$reactions--{*reaction.variable*}, $]`
}

const boundaryConditionsStep: FESTIMStep = {
  title: "6. Boundary Conditions",
  settings: [
    {
      title: "Boundary Conditions",
      type: "fixed_bc",
      name: "fixed_bcs",
      list: true
    }
  ],
  recipe: `# 6. Create boundary conditions
$fixed_bcs--{*fixed_bc.variable*} = F.FixedConcentrationBC(subdomain={*fixed_bc.surface_subdomain_variable*}, value={*fixed_bc.value*}, species={*fixed_bc.species_variable*})$
@problem--{*problem_variable*}@.boundary_conditions = [$fixed_bcs--{*fixed_bc.variable*}, $]
`
}

const particleSourcesStep: FESTIMStep = {
  title: "7. Particle Sources",
  settings: [
    {
      title: "Particle Sources",
      type: "source",
      name: "sources",
      list: true
    }
  ],
  recipe: `# 7. Create particle sources
$sources--{*source.variable*} = F.ParticleSource(species={*source.species_variable*}, volume={*source.volume_variable*}, value={*source.value*})$
@problem--{*problem_variable*}@.sources = [$sources--{*source.variable*}, $]`
}

const temperatureStep: FESTIMStep = {
  title: "8. Temperature",
  settings: [
    {
      title: "Temperature (K)",
      type: "number",
      name: "temperature"
    }
  ],
  recipe: `# 8. Temperature
@problem--{*problem_variable*}@.temperature = {*temperature*}  # K
`
}

const settingsStep: FESTIMStep = {
  title: "9. Settings",
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
    {
      title: "stepsize",
      type: "number",
      name: "stepsize"
    },
    {
      title: "final_time",
      type: "number",
      name: "final_time"
    }
  ],
  recipe: `# 9. Settings
@problem--{*problem_variable*}@.settings = F.Settings(
    atol={*atoi*}, rtol={*rtoi*}, transient={*transient*}, stepsize={*stepsize*}, final_time={*final_time*}
)`
}

const exportsStep: FESTIMStep = {
  title: "10. Exports",
  settings: [
    {
      title: "Field export list variable",
      name: "field_export_list_variable",
      type: "string"
    },
    {
      title: "Derived export list variable",
      name: "derived_export_list_variable",
      type: "string"
    },
    {
      title: "VTX Species Exports",
      type: "vtx_export",
      name: "vtx_exports",
      list: true
    },
    {
      title: "Derived Quantities - Surface",
      type: "surface_quantity",
      name: "surface_quantities",
      list: true
    },
    {
      title: "Derived Quantities - Volume",
      type: "volume_quantity",
      name: "volume_quantities",
      list: true
    },
  ],
  recipe:
    `# 10. Exports
$vtx_exports--{*vtx_export.variable*} = F.VTXSpeciesExport(
  filename=f"{*vtx_export.filename*}",
  field={*vtx_export.field_expression*},
  subdomain={*vtx_export.volume_subdomain_variable*}
)$

{*field_export_list_variable*} = [$vtx_exports--{*vtx_export.variable*}, $]

$surface_quantities--{*surface_quantity.variable*} = F.{*surface_quantity.quantity_type*}(
  field={*surface_quantity.field_expression*},
  surface={*surface_quantity.surface_variable*}
)$
$volume_quantities--{*volume_quantity.variable*} = F.{*volume_quantity.quantity_type*}(
  field={*volume_quantity.field_expression*},
  volume={*volume_quantity.volume_variable*}
)$

{*derived_export_list_variable*} = [$surface_quantities--{*surface_quantity.variable*}, $$volume_quantities--{*volume_quantity.variable*}, $]
  
@problem--{*problem_variable*}@.exports = {*field_export_list_variable*} + {*derived_export_list_variable*}
`,
  exportAddress: "vtx_exports$vtx_export.filename",
  exporting: true
}

const runStep: FESTIMStep = {
  title: "11. Run",
  description: "Proceed to run the simulation",
  settings: [
    {
      title: "Run",
      type: "run"
    }
  ],
  recipe: `# 11. Run
# initialise and run the problem
@problem--{*problem_variable*}@.initialise()
@problem--{*problem_variable*}@.run()
`
}

export const exampleSimulation: FESTIMSim = {
  title: "Example Simulation",
  description: "This is an example simulation that introcues new users to the concepts of simple variables, object properties, and lists in FESTIM View",
  imageCaption: "A simple character profile of Miles Morales which illustrates the FESTIM View templating conventions",
  steps: [
    exampleStep
  ],
  imageUrl: "/Example Simulation.png"
}

export const permeation2DSimulation: FESTIMSim = {
  title: "2D Permeation",
  description: "In this task, we’ll go through the basics of FESTIM and run a simple permeation simulation on a 2D domain.",
  imageCaption: "Image of a Hydrogen isotope permeating across a simple 2D rectangular mesh",
  preCode: `# Code copied from the 2d_permeation FESTIM example
import warnings

import dolfinx
import festim as F
import matplotlib.pyplot as plt
import numpy as np
from mpi4py import MPI

if F.__version__ != "2.0b2.post2":
    warnings.warn(
        "This example was tested with festim version 2.0b2.post2. "
        "If you are using a different version, the results may differ.",
        stacklevel=2,
    )`,
  steps: [
    problemStep,
    meshStep,
    materialsStep,
    domainsStep,
    speciesStep,
    initialConditionsStep,
    reactionsStep,
    boundaryConditionsStep,
    particleSourcesStep,
    temperatureStep,
    settingsStep,
    exportsStep,
    // testingPageVariablesStep,
    runStep
  ],
  imageUrl: "/2D Permeation.png"
}

export const presetSimulations: FESTIMSim[] = [
  permeation2DSimulation,
  exampleSimulation
]


export const populateBindings: Function = (simulation: FESTIMSim, storedBindings: object[], empty: boolean = false) => {
  let bindings = []
  if (typeof storedBindings == "undefined") storedBindings = []

  let correspondingObjectProperties = (objectKeys: string[], query: string) => {
    let out: string[] = []
    for (let key of objectKeys) {
      if (key.includes(query)) {
        out.push(key)
      }
    }
    return out
  }

  for (let i = 0; i < simulation.steps.length; i++) {
    let step: FESTIMStep = simulation.steps[i]
    let values: { [key: string]: any } = {}
    if (!empty) {
      let storedBinding = storedBindings[i]
      let objectKeys = null

      if (storedBinding) {
        let keys = Object.keys(storedBinding.values)
        console.log(keys)
        objectKeys = keys.filter(key => key.includes("."))
        console.log("Object keys are: ", objectKeys)
      }

      for (let setting of step.settings) {
        let binding = setting.name ?? setting.title
        let objectProps: string[] = []
        if (objectKeys) {
          objectProps = correspondingObjectProperties(objectKeys, binding)
        }

        if (setting.defaultValue || (storedBinding && binding in storedBinding.values)) {
          values[binding] = setting.defaultValue ?? storedBinding.values[binding]
          for (let objectProp of objectProps) {
            values[objectProp] = storedBinding.values[objectProp]
          }
        } else {
          values[binding] = setting.list ? [{}] : ""
        }
      }
    }
    bindings.push({
      index: i,
      name: step.name,
      title: step.title,
      snippet: "",
      values,
      recipe: step.recipe ?? "",
      exporting: step.exporting ?? false,
      exportAddress: step.exportAddress ?? null
    })
  }
  return bindings
}