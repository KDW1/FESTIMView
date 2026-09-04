// TODO: For list expression need: 1) Better separator notation, 2) New format for enclosing expressions

import { permeation2DSimulation, permeationClasses } from "./simulations/2d_permeation_sim";
import { gmshSimulation } from "./simulations/gmsh_sim";

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
  propertiesToExclude?: string[]; // List of properties to exclude (make optional per-se) for objects
}

// Step in a FESTIM simulation
export type FESTIMStep = {
  title: string;
  name?: string;
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
  cookieCutterSettings?: string;
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
  ...permeationClasses
}

export const genericSteps: { [key: string]: FESTIMStep } = {
  "problem": {
    title: "Problem",
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
    recipe: "# Create empty problem\n{*problem_variable*}=F.{*problem_type*}()"
  },
  "materials": {
    title: "Materials",
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
    recipe: `# Create materials
$materials--{*material.variable*} = F.Material(name="{*material.name*}", D_0={*material.D_0*}, E_D={*material.E_D*}, K_S_0={*material.K_S_0*}, E_K_S={*material.E_K_S*})$`
  },
  "domains": {
    title: "Domains",
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
    recipe: `# Create domains
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
  },
  "species": {
    title: "Species",
    name: "species",
    settings: [
      {
        title: "Species",
        type: "species",
        name: "specieses",
        list: true
      }
    ],
    recipe:
      `# Create species
$specieses--{*species.variable*} = F.Species(name="{*species.name*}", mobile={*species.mobile*})
{*species.variable*}.subdomains = [{*species.subdomains*}]
$

@problem--{*problem_variable*}@.species = [$specieses--{*species.variable*}, $]`
  },
  "initialConditions": {
    title: "Initial Conditions",
    name: "initialConditions",
    settings: [
      {
        title: "Initial Concentrations",
        type: "concentration",
        name: "concentrations",
        list: true
      }
    ],
    recipe: `# Create initial conditions
# at t=0, c_empty_trap = 1 in volume 1
$concentrations--{*concentration.variable*} = F.InitialConcentration(species={*concentration.species_variable*}, value={*concentration.value*}, volume={*concentration.volume_variable*})$
@problem--{*problem_variable*}@.initial_conditions = [$concentrations--{*concentration.variable*}, $]

# NOTE by default other ICs are set to zero`
  },
  "reactions": {
    title: "Reactions",
    name: "reactions",
    settings: [
      {
        title: "Reactions",
        type: "reaction",
        name: "reactions",
        list: true
      }
    ],
    recipe: `# Create reactions
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
  },
  "boundaryConditions": {
    title: "Boundary Conditions",
    name: "boundaryConditions",
    settings: [
      {
        title: "Boundary Conditions",
        type: "fixed_bc",
        name: "fixed_bcs",
        list: true
      }
    ],
    recipe: `# Create boundary conditions
$fixed_bcs--{*fixed_bc.variable*} = F.FixedConcentrationBC(subdomain={*fixed_bc.surface_subdomain_variable*}, value={*fixed_bc.value*}, species={*fixed_bc.species_variable*})$
@problem--{*problem_variable*}@.boundary_conditions = [$fixed_bcs--{*fixed_bc.variable*}, $]
`
  },
  "particleSources": {
    title: "Particle Sources",
    name: "particleSources",
    settings: [
      {
        title: "Particle Sources",
        type: "source",
        name: "sources",
        list: true
      }
    ],
    recipe: `# Create particle sources
$sources--{*source.variable*} = F.ParticleSource(species={*source.species_variable*}, volume={*source.volume_variable*}, value={*source.value*})$
@problem--{*problem_variable*}@.sources = [$sources--{*source.variable*}, $]`
  },
  "temperature": {
    title: "Temperature",
    name: "temperature",
    settings: [
      {
        title: "Temperature (K)",
        type: "number",
        name: "temperature"
      }
    ],
    recipe: `# Temperature
@problem--{*problem_variable*}@.temperature = {*temperature*}  # K
`
  },
  "settings": {
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
    recipe: `# Settings
@problem--{*problem_variable*}@.settings = F.Settings(
    atol={*atoi*}, rtol={*rtoi*}, transient={*transient*}, stepsize={*stepsize*}, final_time={*final_time*}
)`
  },
  "exports": {
    title: "Exports",
    name: "exports",
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
      `# Exports
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
  },
  "run": {
    title: "Run",
    name: "run",
    description: "Proceed to run the simulation",
    settings: [
      {
        title: "Run",
        type: "run"
      }
    ],
    recipe: `# Run
# initialise and run the problem
@problem--{*problem_variable*}@.initialise()
@problem--{*problem_variable*}@.run()
`
  }
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

export const exampleSimulation: FESTIMSim = {
  title: "Example Simulation",
  description: "This is an example simulation that introcues new users to the concepts of simple variables, object properties, and lists in FESTIM View",
  imageCaption: "A simple character profile of Miles Morales which illustrates the FESTIM View templating conventions",
  steps: [
    exampleStep
  ],
  imageUrl: "/Example Simulation.png"
}

export const populateBindings: Function = (simulation: FESTIMSim, storedBindings: { values: { [key: string]: any } }[], empty: boolean = false) => {
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

    let storedBinding = storedBindings[i]
    let objectKeys = null
    let valid = false

    if (storedBinding) {
      let keys = Object.keys(storedBinding.values)
      objectKeys = keys.filter(key => key.includes("."))
      valid = storedBinding.values["valid"] ?? false
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

    bindings.push({
      index: i,
      name: step.name,
      title: step.title,
      snippet: "",
      values,
      valid,
      recipe: step.recipe ?? "",
      exporting: step.exporting ?? false,
      exportAddress: step.exportAddress ?? null
    })
  }
  return bindings
}