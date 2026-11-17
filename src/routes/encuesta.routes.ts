import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { listarPreguntas } from '../repositories/encuesta.repository';
import { seccionesEncuesta } from '../services/encuesta.catalogo';
import { guardarEncuesta, validarBeneficiario } from '../services/encuesta.service';

const router = Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intente nuevamente en unos minutos.' } }));
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.get('/preguntas', async (_req, res, next) => {
  try { res.json({ secciones: seccionesEncuesta, preguntas: await listarPreguntas() }); } catch (error) { next(error); }
});
router.post('/validar', async (req, res, next) => {
  try { const { rut } = z.object({ rut: z.string().max(20) }).parse(req.body); res.json(await validarBeneficiario(rut)); } catch (error) { next(error); }
});
router.post('/respuestas', async (req, res, next) => {
  try { await guardarEncuesta(req.body); res.status(201).json({ message: 'Gracias por responder.' }); } catch (error) { next(error); }
});
export default router;
