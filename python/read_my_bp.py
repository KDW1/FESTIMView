import os
import vtk
import adios2
import math
from vtkmodules.util.numpy_support import vtk_to_numpy
import numpy as np



# Thoughts so far...
# I don't know what H_1, H_trapped_1, empty_trap_1 convey besides some time-dependent info?
# Connectivity, shows the topology for the VTKLagrangeTriangles
# Geometry, shows the point data for the mesh
# NumberOfNodes, corresponds to point count
# NumberOfEntitties, corresponds to cell count
# types, corresponds to the vtkCellType
# step, denotes the stepping for the animation
# vtkGhostType ? 

# TODO: Learn how to incorporate the field data

input_filepath = os.path.join(os.getcwd(), "out/field_export.bp")

def write_down_ugrid(ugrid, filepath):
    writer = vtk.vtkXMLUnstructuredGridWriter()
    writer.SetInputDataObject(ugrid)
    writer.SetFileName(os.path.join(os.getcwd(), filepath))
    writer.Write()
    
def add_relevant_point_data(dataset, values):
        fields = ["H_1", "H_trapped_1", "empty_trap_1"]
        for field in fields:
            float_array = vtk.vtkFloatArray()
            float_array.SetName(field)
            for value in values[field]:
                float_array.InsertNextValue(value[0])
                
            # print(float_array)
            dataset.GetPointData().AddArray(float_array)
        
        # add_time_info_to(dataset)
    
def add_cells_to_dataset(dataset, values):
    for _, pId1, pId2, pId3 in values["connectivity"]:
        lagrange_triangle = vtk.vtkLagrangeTriangle()
        lagrange_triangle.GetPointIds().InsertNextId(pId1)
        lagrange_triangle.GetPointIds().InsertNextId(pId2)
        lagrange_triangle.GetPointIds().InsertNextId(pId3)
        dataset.InsertNextCell(lagrange_triangle.GetCellType(), lagrange_triangle.GetPointIds())
    
def read_bp_file_to(input_filepath, output_filepath_prefix):
    points = vtk.vtkPoints()
    timestamps = list()
    variable_information = dict()

    SCALAR_FIELD_NAME = "SyntheticField"
    DEBUGGING = False 
    with adios2.FileReader(input_filepath) as s:
        relevant_values = dict()
        
        vars = s.available_variables()
        attributes = s.available_attributes()
        
        for name, info in vars.items():
            print("\nvariable_name: " + name, end=" ")
            obj = dict()
            for key, value in info.items():
                obj[key] = value
                print("\t" + key + ": " + value, end=" ")
            print("\n\n")
            variable_information[name] = obj
        # if DEBUGGING: 
        # print("Attribute Keys: ", attributes.keys())
        
        xml_root = attributes["vtk.xml"]
        if DEBUGGING: print(f"\nThe XML Root is\n", xml_root)
        
        interval_count = int(vars["step"]["AvailableStepsCount"])
        time_step = float(min(s.read("step", step_selection=[0, interval_count])))
        
        for step in range(interval_count):
            variables_dictionary = dict()
            for variable_of_interest in vars:
                data_of_interest = s.read(variable_of_interest, step_selection=[step, 1])
                # if step == 0 and variable_of_interest == "H_1":
                    # print(f"Variable {variable_of_interest}: ", data_of_interest.tolist())
                variables_dictionary[variable_of_interest] = data_of_interest.tolist()
                
                # print(f"Data of interest, {variable_of_interest}\n", data_of_interest.tolist())
                if variable_of_interest == "geometry":
                    for point in data_of_interest:
                        points.InsertNextPoint(point)
                        
            timestamps.append((time_step+time_step*step, variables_dictionary))
        
    
    count = 0
    
    print(f"There are {len(timestamps)} times")
    print([time for time, values in timestamps])
    for time, values in timestamps:
        points = vtk.vtkPoints()
        for point in values["geometry"]:
            points.InsertNextPoint(point)
        ugrid = vtk.vtkUnstructuredGrid()
        ugrid.SetPoints(points)
        
        add_cells_to_dataset(ugrid, values)
        add_relevant_point_data(ugrid, values)
        
        # print(f"\n\nAt time, t = {time}")
        # print(values["H_trapped_1"][:10])
        
        time_array = vtk.vtkDoubleArray()
        time_array.SetName("TimeValue")
        time_array.SetNumberOfTuples(1)
        time_array.SetValue(0, np.float64(time))
        
        ugrid.GetFieldData().AddArray(time_array)
        
        # print("Unstructured Grid Point Data: ", ugrid.GetPointData())
        
        write_down_ugrid(ugrid, output_filepath_prefix+str(count)+".vtu")
        count += 1

    return relevant_values, variable_information
    

# 2. Execute code AFTER the stream is finished
relevant_values, relevant_vars = read_bp_file_to("out/field_export.bp", "vtk_temp/example")

# print("Relevant Values' Keys: ", relevant_values.keys())
# print("Relevant Variables' Keys: ", relevant_vars)