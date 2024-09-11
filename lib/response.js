export default function({title, text, error = ''}) {
    return  `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Build Error / Erreur de Compilation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            color: #333;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .error-container {
            text-align: center;
            background-color: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #dc3545;
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
        .lang-switch img {
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
    <div class="error-container">
        <h1>${ title }</h1>
        <p>${ text }</p>
        ${ error && `<pre>${ error }</pre>` }
    </div>
    <footer>
      <p>Powered by <a href="https://github.com/internet2000/eleventy-preview-server">Eleventy Preview Server</a></p>
    </footer>
</body>
</html>
`
}
