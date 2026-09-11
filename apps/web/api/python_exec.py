import json
import io
import sys
import os
import traceback
import base64
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}

            code = data.get('code', '')
            task = data.get('task', 'exec')
            params = data.get('params', {})

            # Execution capture
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()

            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = stdout_capture
            sys.stderr = stderr_capture

            result_data = {}
            error = None

            # Setup headless matplotlib backend before execution
            try:
                import matplotlib
                matplotlib.use('Agg')
                import matplotlib.pyplot as plt
                plt.clf()
                plt.close('all')
            except Exception:
                plt = None

            try:
                # Built-in execution scope with pre-imported scientific & doc libraries
                exec_globals = {
                    "__builtins__": __builtins__,
                    "json": json,
                    "io": io,
                    "base64": base64,
                    "params": params,
                }
                
                # Pre-import common scientific, charting, and data libraries
                for mod_name in ["math", "reportlab", "PIL", "matplotlib", "numpy", "pandas", "sympy", "pypdf", "pdfplumber"]:
                    try:
                        exec_globals[mod_name] = __import__(mod_name)
                    except ImportError:
                        pass
                
                if plt is not None:
                    exec_globals["plt"] = plt

                exec(code, exec_globals)
                
                # 1. Automatically capture matplotlib figures if generated
                if plt is not None and len(plt.get_fignums()) > 0:
                    img_buf = io.BytesIO()
                    plt.savefig(img_buf, format='png', bbox_inches='tight', dpi=150, facecolor='#12131a', edgecolor='none')
                    img_buf.seek(0)
                    chart_base64 = base64.b64encode(img_buf.read()).decode('utf-8')
                    result_data["image_base64"] = chart_base64
                    result_data["mime_type"] = "image/png"
                    plt.close('all')

                # 2. Check for explicit output artifacts created in globals
                if "OUTPUT_FILE_BASE64" in exec_globals:
                    result_data["file_base64"] = exec_globals["OUTPUT_FILE_BASE64"]
                if "OUTPUT_MIME" in exec_globals:
                    result_data["mime_type"] = exec_globals["OUTPUT_MIME"]
                if "RESULT" in exec_globals:
                    result_data["result"] = str(exec_globals["RESULT"])

            except Exception as e:
                error = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            finally:
                sys.stdout = old_stdout
                sys.stderr = old_stderr

            output_stdout = stdout_capture.getvalue()
            output_stderr = stderr_capture.getvalue()

            response_payload = {
                "success": error is None,
                "stdout": output_stdout,
                "stderr": output_stderr,
                "error": error,
                "data": result_data
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))

        except Exception as err:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(err)
            }).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
