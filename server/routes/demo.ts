import { RequestHandler } from "express";
import { DemoResponse } from "@shared/api";

export const handleDemo: RequestHandler = (req, res) => {
  const response: DemoResponse = {
    message: "Luster Dental Lab ERP API v1.0",
  };
  res.status(200).json(response);
};
