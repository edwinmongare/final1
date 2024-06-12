import express from "express";
import { getPayloadClient } from "./get-payload";
import { nextApp, nextHandler } from "./next-utils";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./trpc";
import { inferAsyncReturnType } from "@trpc/server";
import nextBuild from "next/dist/build";
import path from "path";
import { parse } from "url";
import { PayloadRequest } from "payload/types";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({
  req,
  res,
});

export type ExpressContext = inferAsyncReturnType<typeof createContext>;

const start = async () => {
  const payload = await getPayloadClient({
    initOptions: {
      express: app,
      onInit: async (cms) => {
        cms.logger.info(`Admin URL: ${cms.getAdminURL()}`);
      },
    },
  });

  if (process.env.NEXT_BUILD) {
    app.listen(PORT, async () => {
      payload.logger.info("Next.js is building for production");

      // @ts-expect-error
      await nextBuild(path.join(__dirname, "../"));

      process.exit();
    });

    return;
  }

  // Reusable middleware for authentication and redirection
  const authenticateAndRedirect =
    (origin: string) =>
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const request = req as PayloadRequest;
      if (!request.user) {
        return res.redirect(`/sign-in?origin=${encodeURIComponent(origin)}`);
      }
      next();
    };

  // Create reusable render function for routes
  const renderPage =
    (page: string) => (req: express.Request, res: express.Response) => {
      const parsedUrl = parse(req.url, true);
      const { query } = parsedUrl;
      return nextApp.render(req, res, `/${page}`, query);
    };

  // Define the routes using the reusable middleware
  app.use(
    "/create-order",
    authenticateAndRedirect("create-order"),
    renderPage("create-order")
  );
  app.use(
    "/analytics",
    authenticateAndRedirect("analytics"),
    renderPage("analytics")
  );
  app.use(
    "/verify-certificate",
    authenticateAndRedirect("verify-certificate"),
    renderPage("verify-certificate")
  );
  app.use(
    "/view-orders",
    authenticateAndRedirect("view-orders"),
    renderPage("view-orders")
  );

  app.use(
    "/api/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.use((req, res) => nextHandler(req, res));

  nextApp.prepare().then(() => {
    payload.logger.info("Next.js started");

    app.listen(PORT, async () => {
      payload.logger.info(
        `Next.js App URL: ${process.env.NEXT_PUBLIC_SERVER_URL}`
      );
    });
  });
};

start();
