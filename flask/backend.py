import os
import json 
import traceback
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import io
import sys
from contextlib import redirect_stdout, redirect_stderr

load_dotenv()

app = Flask(__name__)

@app.route("/")
def index():
    return jsonify({"success": True, "message": "Server is online and running..."})

@app.route("/exec", methods=["POST", "GET"])
def execute_code():
    app.logger.info("Received a request to /exec")
    if request.method == "POST":
        data = request.json
        code = data.get("code", "")

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
            
            if error_output:
                print("There was an error output oh no: ", error_output)
                return jsonify({
                    "success": False,
                    "error": error_output
                })
            
            return jsonify({
                "success": True,
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