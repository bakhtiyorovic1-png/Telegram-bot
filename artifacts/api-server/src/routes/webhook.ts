import { Router } from "express";
import { bot } from "../bot";

const webhookRouter = Router();

webhookRouter.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

export default webhookRouter;
