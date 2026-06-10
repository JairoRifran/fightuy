import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Cargar todas las variables de entorno (incluyendo las secretas sin prefijo VITE_)
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [
      {
        name: 'elevenlabs-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/elevenlabs-sound' && req.method === 'POST') {
              try {
                // Leer el cuerpo de la peticion POST
                let body = '';
                for await (const chunk of req) {
                  body += chunk;
                }

                let parsedBody = {};
                if (body) {
                  try {
                    parsedBody = JSON.parse(body);
                  } catch (e) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'JSON malformado en dev server' }));
                    return;
                  }
                }

                // Importar dinamicamente el controlador serverless local
                const { default: handler } = await import('./api/elevenlabs-sound.js');

                const mockReq = {
                  method: 'POST',
                  body: parsedBody
                };

                const mockRes = {
                  statusCode: 200,
                  headers: {},
                  status(code) {
                    this.statusCode = code;
                    return this;
                  },
                  setHeader(name, val) {
                    this.headers[name] = val;
                    return this;
                  },
                  json(jsonVal) {
                    res.statusCode = this.statusCode;
                    res.setHeader('Content-Type', 'application/json');
                    for (const [k, v] of Object.entries(this.headers)) {
                      res.setHeader(k, v);
                    }
                    res.end(JSON.stringify(jsonVal));
                  },
                  send(buffer) {
                    res.statusCode = this.statusCode;
                    for (const [k, v] of Object.entries(this.headers)) {
                      res.setHeader(k, v);
                    }
                    res.end(buffer);
                  }
                };

                await handler(mockReq, mockRes);
              } catch (err) {
                console.error('Error en middleware local de ElevenLabs:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Error interno en dev server middleware', details: err.message }));
              }
            } else {
              next();
            }
          });
        }
      }
    ]
  };
});
