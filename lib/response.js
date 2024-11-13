export default function({title, text, error = null}) {
    return  `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eleventy Preview Server</title>
    <!-- Favicon -->
    <link rel="icon" href="${error ? 'data:image/png;base64,iVBORw0KGgo=' : 'data:image/png;base64,iVBORw0KGgo='}" type="image/x-icon">
    <style>
        body {
            display: flex;
            flex-direction: column;
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            color: #333;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            background-color: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            ${ error ? 'border: 1px solid #dc3545;' : 'max-width: 600px;' }
            width: 80%;
            margin: auto;
        }
        footer {
            width: 100%;
            background-color: #f8f9fa;
            padding: 10px 0;
            text-align: center;
        }
        h1 {
            color: ${ error ? '#dc3545' : '#00a021' };
        }
        p {
            font-size: 18px;
            margin-bottom: 20px;
        }
        pre {
            background-color: #f1f1f1;
            padding: 15px;
            border-radius: 5px;
            text-align: left;
            overflow-x: auto;
        }
        .lang-switch {
            margin-bottom: 20px;
        }
            width: 30px;
            cursor: pointer;
            margin: 0 10px;
        }
        .lang-switch img:hover {
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${ title }</h1>
        <p>${ text }</p>
        ${ error ? `
            <pre>${ error.message }</pre>
            ${ error.stderr || error.stdout ? `
                <details>
                    <summary>Full logs</summary>
                    <pre>${ error.stderr || '' }</pre>
                    <hr/>
                    <pre>${ error.stdout || '' }</pre>
                </details>
            ` : ''}
        ` : ''}
    </div>
    <footer>
      <p>Powered by <a href="https://github.com/internet2000/eleventy-preview-server">Eleventy Preview Server</a></p>
    </footer>
</body>
</html>
`
}
