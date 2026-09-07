import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vehiclesRouter from "./vehicles";
import dieselRouter from "./diesel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vehiclesRouter);
router.use(dieselRouter);

export default router;
