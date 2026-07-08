import os
import json 
import traceback
from flask import Flask, request, jsonify, send_file
from dotenv import load_dotenv
import io
import sys
from contextlib import redirect_stdout, redirect_stderr
from read_my_bp import read_bp_file_to

load_dotenv()

def zip_from_folder(folder_name):
    filepath = os.path.join(os.getcwd(), folder_name)
    
    import zipfile
    import time

    timestr = time.strftime("%Y%m%d-%H%M%S")
    download_name = "field_export.zip".format(timestr)
    memory_file = io.BytesIO()

    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(filepath, topdown=False):
            for file in files:
                indexOfOut = root.index(folder_name)
                zipf.write(os.path.join(root[indexOfOut:], file))
    memory_file.seek(0)
    
    app.logger.info("Current Working Directory: " + os.getcwd())
    app.logger.info("Returning .zip file of: " +  filepath)
    
    return memory_file, download_name

app = Flask(__name__)

@app.route("/")
def index():
    return jsonify({"success": True, "message": "Server is online and running..."})

@app.route("/exec", methods=["POST", "GET"])
def execute_code():
    app.logger.info("Received a request to /exec")
    if request.method == "POST":
        data = request.get_json()
        code = data.get("code", "")
        postprocessing = data.get("postprocessing", "")
        app.logger.info(data)
        
        if postprocessing:
            app.logger.info("We are post processing (Flask)!")

        if not code.strip():
            return jsonify({
                "success": False,
                "error": "No code provided..."
            }), 400
        
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        temp_namespace = {}

        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, temp_namespace)
            
            output = stdout_capture.getvalue()
            error_output = stderr_capture.getvalue()
            
            if error_output and not postprocessing:
                # Since for some reason the FESTIM updates are registered as error output
                print("There was an error output oh no: ", error_output)
                return jsonify({
                    "success": False,
                    "output": output,
                    "error": error_output
                })
            if not postprocessing:
                return jsonify({
                    "success": True,
                    "output": output
                })
            else:
                if error_output:
                    app.logger.info("Error output occurred...")
                    app.logger.info(error_output)
                read_bp_file_to("out/field_export.bp", "vtk_temp/example")
                memory_file, download_name = zip_from_folder("out/field_export.bp")
                return send_file(memory_file, download_name=download_name, as_attachment=True)
        except SyntaxError as e:
            return jsonify({
                "success": False,
                "error": f"Syntax Error: {str(e)}"
            }), 400
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Exception: {str(e)}"
            }), 400
    else:
        return jsonify({
            "success": False,
            "message": "This /exec path only receives POST requests..."
        }), 400

@app.route("/eval", methods=["POST", "GET"])
def evaluate_expression():
    app.logger.info("Received a request to /eval")
    if request.method == "POST":
        data = request.json
        expr = data.get("expr", "")

        if not expr.strip():
            return jsonify({
                "success": False,
                "error": "No expression provided..."
            }), 400
        
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        temp_namespace = {}

        try:
            app.logger.info("Expression: ", expr)
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                result = eval(expr, temp_namespace)
            
            output = stdout_capture.getvalue()
            error_output = stderr_capture.getvalue()
            
            if error_output:
                print("There was an error output oh no: ", error_output)
                return jsonify({
                    "success": False,
                    "error": error_output
                })
            
            return jsonify({
                "success": True,
                "result": result,
                "output": output
            })
        except SyntaxError as e:
            return jsonify({
                "success": False,
                "error": f"Syntax Error: {str(e)}"
            }), 400
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Error: {str(e)}"
            }), 400
    else:
        return jsonify({
            "success": False,
            "message": "This /eval path only receives POST requests..."
        }), 400

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 8000))
    print("Hello there...our port is: ", port)
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_ENV") != "production")