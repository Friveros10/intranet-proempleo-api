import { Router } from "express";
import { itemGastosController as controller } from "../controllers/itemGastos.controller";
import { asyncHandler } from "../utils/asyncHandler";

// El router de marcos aplica la autenticación y los roles.
const router = Router();
router.get("/:id/items-gasto", asyncHandler(controller.listar));
router.post("/:id/items-gasto", asyncHandler(controller.guardar));
export default router;
