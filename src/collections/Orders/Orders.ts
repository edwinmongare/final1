import { CollectionConfig, Access } from "payload/types";
import {
  AfterChangeHook,
  BeforeChangeHook,
} from "payload/dist/collections/config/types";
import { User, Order, IssuingOfficer } from "../../payload-types";
import payload from "payload";
import { PrimaryActionEmailHtml } from "../../components/emails/PrimaryActionEmail";

const addUser: BeforeChangeHook<Order> = async ({ req, data, originalDoc }) => {
  const user = req.user;

  // If it's an update operation, do not modify the user field
  if (originalDoc) {
    return data;
  }

  return { ...data, user: user.id };
};
// Define the BeforeChangeHook to add the issuing officer to the order
const issuingOfficer: BeforeChangeHook<Order> = async ({
  req,
  data,
  originalDoc,
}) => {
  const issuingOfficerData = originalDoc?.issuingOfficer || data.issuingOfficer;
  console.log(issuingOfficerData, "issuingOfficerData");
  return { ...data, issuingOfficer: issuingOfficerData };
};

// const issuingOfficer: BeforeChangeHook<IssuingOfficer> = async ({
//   req,
//   data,
//   originalDoc,
// }) => {
//   const issuingOfficer = originalDoc?.issuingOfficer;
//   console.log(issuingOfficer, "issuingOfficerData");

//   return { ...data, issuingOfficer: issuingOfficer };
// };

const sendVerificationEmailAfterApproval: AfterChangeHook<Order> = async ({
  req,
  doc,
}) => {
  const { approvedForSale, user } = doc;

  if (approvedForSale === "approved" && user) {
    const userEmails: string[] = Array.isArray(user)
      ? user
          .map((userId) =>
            typeof userId === "string" ? userId : userId.email || ""
          )
          .filter(Boolean)
      : [typeof user === "string" ? user : "edwinmongare15@gmail.com" || ""];

    for (const userEmail of userEmails) {
      // Send verification email for each user associated with the order
      payload.sendEmail({
        from: "delivered@resend.dev",
        to: userEmail,
        subject: "Order Confirmed",
        html: PrimaryActionEmailHtml({
          actionLabel: "Pacesetter Account",
          buttonText: "Download certificate",
          href: `${process.env.NEXT_PUBLIC_SERVER_URL}`,
        }),
      });
    }
  }
};
const yourOwnAndPurchased: Access = async ({ req }) => {
  const user = req.user as User | null;

  if (user?.role === "admin" || "administrator") return true;
  if (!user) return false;

  const { docs: products } = await req.payload.find({
    collection: "orders",
    depth: 1,
    where: {
      user: {
        equals: user.id,
      },
    },
  });

  const ownProductFileIds = products.map((prod) => prod.id).flat();

  const { docs: orders } = await req.payload.find({
    collection: "orders",
    depth: 2,
    where: {
      user: {
        equals: user.id,
      },
    },
  });

  const purchasedProductFileIds = orders
    .map((order) => {
      return orders.map((product) => {
        if (typeof product === "string")
          return req.payload.logger.error(
            "Search depth not sufficient to find purchased file ID's"
          );

        return typeof product.id === "string" ? product.id : product.id;
      });
    })
    .filter(Boolean)
    .flat();

  return {
    id: {
      in: [...ownProductFileIds, ...purchasedProductFileIds],
    },
  };
};

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    useAsTitle: "orders",
    defaultColumns: ["email", "surname", "localGovernment", "firstName"],
    hideAPIURL: false,
    description: "Approve or reject incoming orders",
  },
  hooks: {
    beforeChange: [addUser, issuingOfficer],
    afterChange: [sendVerificationEmailAfterApproval],
  },
  access: {
    read: yourOwnAndPurchased,
    update: ({ req: { user } }) =>
      user.role === "user" ||
      user.role === "admin" ||
      user.role === "administrator",
    delete: ({ req: { user } }) =>
      user.role === "admin" || user.role === "administrator",
    create: ({ req: { user } }) => user.role === "user",
  },
  upload: {
    staticURL: "/media",
    staticDir: "media",
    mimeTypes: ["image/*", "application/pdf"],
  },
  fields: [
    {
      name: "user",
      label: "user",
      admin: {
        condition: () => true,
      },
      type: "relationship",
      relationTo: "users",
      hasMany: true,
    },

    {
      name: "surname",
      label: "Surname",
      type: "text",
      required: true,
    },
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      required: true,
    },
    {
      name: "otherName",
      label: "Other Name",
      type: "text",
      required: false,
    },
    {
      name: "localGovernment",
      label: "Local Government",
      type: "text",
      required: true,
    },
    {
      name: "homeTown",
      label: "Home Town",
      type: "text",
      required: true,
    },
    {
      name: "compoundOrVillage",
      label: "Compound / village",
      type: "text",
      required: true,
    },
    {
      name: "price",
      label: "Price in Naira",
      type: "text",
      required: true,
      defaultValue: "1000",
    },
    {
      name: "approvedForSale",
      label: "Order Status",
      type: "select",
      defaultValue: "pending",
      options: [
        {
          label: "Pending verification",
          value: "pending",
        },
        {
          label: "Approved",
          value: "approved",
        },
        {
          label: "Denied",
          value: "denied",
        },
      ],
    },
    {
      name: "_flutterwaveID",
      label: "FlutterWave Payment ID",
      access: {
        read: ({ req }) =>
          req.user.role === "admin" || req.user.role === "user",
        create: ({ req }) => req.user.role === "admin",
        update: ({ req }) =>
          req.user.role === "admin" || req.user.role === "user",
      },
      type: "text",
      required: true,
      defaultValue: "no payment id",
    },
    {
      name: "issuingOfficer",
      label: "issuing officer",
      type: "relationship",
      relationTo: "issuingOfficer",
      hasMany: true,
    },
    {
      name: "stampTemplate",
      label: "Stamp",
      type: "relationship",
      relationTo: "stampTemplate",
      hasMany: true,
    },
    {
      name: "_isPaid",
      type: "checkbox",
      access: {
        read: ({ req }) =>
          req.user.role === "admin" || req.user.role === "user",
        create: ({ req }) => req.user.role === "admin",
        update: ({ req }) =>
          req.user.role === "admin" || req.user.role === "user",
      },
      admin: {
        hidden: true,
      },
      required: true,
    },
  ],
};
