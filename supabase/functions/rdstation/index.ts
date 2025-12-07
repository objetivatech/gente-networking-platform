import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RD_STATION_API_KEY = Deno.env.get("RD_STATION_API_KEY");
const RD_STATION_BASE_URL = "https://api.rd.services";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactPayload {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  tags?: string[];
  custom_fields?: Record<string, string>;
}

interface ConversionPayload {
  conversion_identifier: string;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  cf_cargo?: string;
  cf_empresa?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RD_STATION_API_KEY) {
    console.error("RD_STATION_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "RD Station API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { action, data } = await req.json();
    console.log("RD Station action:", action, data);

    let response: Response;

    switch (action) {
      case "create_contact":
        response = await createContact(data);
        break;
      case "update_contact":
        response = await updateContact(data);
        break;
      case "create_conversion":
        response = await createConversion(data);
        break;
      case "add_tags":
        response = await addTags(data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const responseData = await response.json();
    console.log("RD Station response:", response.status, responseData);

    return new Response(JSON.stringify(responseData), {
      status: response.ok ? 200 : response.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in RD Station integration:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function createContact(data: ContactPayload): Promise<Response> {
  return fetch(`${RD_STATION_BASE_URL}/platform/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RD_STATION_API_KEY}`,
    },
    body: JSON.stringify({
      email: data.email,
      name: data.name,
      personal_phone: data.phone,
      company_name: data.company,
      tags: data.tags || ["gente-networking"],
      ...data.custom_fields,
    }),
  });
}

async function updateContact(data: ContactPayload): Promise<Response> {
  return fetch(`${RD_STATION_BASE_URL}/platform/contacts/email:${encodeURIComponent(data.email)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RD_STATION_API_KEY}`,
    },
    body: JSON.stringify({
      name: data.name,
      personal_phone: data.phone,
      company_name: data.company,
      tags: data.tags,
    }),
  });
}

async function createConversion(data: ConversionPayload): Promise<Response> {
  return fetch(`${RD_STATION_BASE_URL}/platform/conversions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RD_STATION_API_KEY}`,
    },
    body: JSON.stringify({
      event_type: "CONVERSION",
      event_family: "CDP",
      payload: {
        conversion_identifier: data.conversion_identifier,
        email: data.email,
        name: data.name,
        personal_phone: data.phone,
        company_name: data.company,
        tags: data.tags || ["gente-networking"],
        cf_cargo: data.cf_cargo,
        cf_empresa: data.cf_empresa,
      },
    }),
  });
}

async function addTags(data: { email: string; tags: string[] }): Promise<Response> {
  return fetch(`${RD_STATION_BASE_URL}/platform/contacts/email:${encodeURIComponent(data.email)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RD_STATION_API_KEY}`,
    },
    body: JSON.stringify({
      tags: data.tags,
    }),
  });
}

serve(handler);
