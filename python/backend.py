import os
import json 
import traceback
from flask import Flask, Response, request, jsonify, send_file, stream_with_context
from dotenv import load_dotenv
import io
import sys
from contextlib import redirect_stdout, redirect_stderr
import subprocess
import threading
import contextlib
import tempfile
import pathlib

# from read_my_bp import read_bp_file_to

load_dotenv()

def zip_from_folder(folder_name, cwd:pathlib.Path=None):
    if cwd is None: cwd = os.getcwd()
    
    app.logger.info("Current Working Directory: " + cwd.name)
    
    import zipfile
    import time

    timestr = time.strftime("%Y%m%d-%H%M%S")
    download_name = "field_export.zip".format(timestr)
    memory_file = io.BytesIO()
    app.logger.info(f"Zipping up file")
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(cwd, topdown=False):
            for file in files:
                arcname = os.path.relpath(os.path.join(root, file), cwd)
                zipf.write(os.path.join(root, file), arcname)
    memory_file.seek(0)
    
    return memory_file, download_name

app = Flask(__name__)
DEFAULT_FILE_PATH = "out/field_export.bp"

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
            if postprocessing:
                app.logger.info("Attempting a stream...")
                # Subprocess live update as inspired by Dunklin's work on festim-gui and this article:
                # https://www.endpointdev.com/blog/2015/01/getting-realtime-output-using-python/
                run_root = (pathlib.Path(tempfile.gettempdir()))
                run_root.mkdir(parents=True, exist_ok=True)
                run_dir = pathlib.Path(tempfile.mkdtemp(prefix="festim-view-", dir=run_root))

                script_path = run_dir / "script.py"
                script_path.write_text(code, encoding="utf-8")
                app.logger.info(f"Made run root: {run_root.absolute()}")
                app.logger.info("Made run dir: {run_dir.absolute()}")
                app.logger.info("Running subprocess")
                app.logger.info(script_path.name)
                
                def stream_post_processing():
                    app.logger.info("Running subprocess")
                    process = subprocess.Popen(
                        ["python", "-u", script_path.name],
                        cwd=run_dir,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=1
                    )
                    app.logger.info("Reading outputs...")
                    filepath = data.get("filepath", DEFAULT_FILE_PATH)
                    yield json.dumps({
                        "success": True,
                        "output": f"Examine {(run_dir/filepath)} to read the fiels",
                        "folder_name": filepath,
                        "directory": run_dir
                    })
                    while True:
                        output = process.stdout.readline()
                        if output == '' and process.poll() is not None:
                            app.logger.info("T")
                            break
                        if output:
                            output_str = str(output.strip())
                            app.logger.info(output_str)
                            yield json.dumps({
                                "success": True,
                                "output": output_str
                            })
                    exit_code = process.wait()
                    app.logger.info("Exit code: " + str(exit_code))
                    # read_bp_file_to("out/field_export.bp", "vtk_temp/example")
                # stream_post_processing()
                return Response(stream_with_context(stream_post_processing()), content_type="application/json")
                
                # ## Read specific filename!
                # filepath = data.get("filepath", DEFAULT_FILE_PATH)
                # memory_file, download_name = zip_from_folder(filepath, run_dir)
                
                # return send_file(memory_file, download_name=download_name, as_attachment=True)
            else:
                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    app.logger.info("Executing file now...")
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
                return jsonify({
                    "success": True,
                    "output": output
                })
        except SyntaxError as e:
            app.logger.info( f"Syntax Error: {str(e)}")
            return jsonify({
                "success": False,
                "error": f"Syntax Error: {str(e)}"
            }), 400
        except Exception as e:
            app.logger.info(f"Exception: {str(e)}")
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
            app.logger.info(f"Syntax Error: {str(e)}")
            return jsonify({
                "success": False,
                "error": f"Syntax Error: {str(e)}"
            }), 400
        except Exception as e:
            app.logger.info(f"Error: {str(e)}")
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