export interface ClerkWebhookUserCreated {
  data: {
    birthday: string;
    created_at: number;
    email_addresses: EmailAddress[];
    external_accounts: any[];
    external_id: string;
    first_name: string;
    gender: string;
    id: string;
    image_url: string;
    last_name: string;
    last_sign_in_at: number;
    object: "user";
    password_enabled: boolean;
    phone_numbers: any[];
    primary_email_address_id: string;
    primary_phone_number_id: string | null;
    primary_web3_wallet_id: string | null;
    private_metadata: Record<string, any>;
    profile_image_url: string;
    public_metadata: Record<string, any>;
    two_factor_enabled: boolean;
    unsafe_metadata: Record<string, any>;
    updated_at: number;
    username: string | null;
    web3_wallets: any[];
  };
  event_attributes: {
    http_request: {
      client_ip: string;
      user_agent: string;
    };
  };
  object: "event";
  timestamp: number;
  type: string;
}

export interface ClerkSessionCreatedEvent {
  data: SessionData;
  event_attributes: EventAttributes;
  object: string;
  timestamp: number;
  type: string;
}

// Email Address Interface
interface EmailAddress {
  email_address: string;
  id: string;
  linked_to: any[];
  object: "email_address";
  verification: {
    status: string;
    strategy: string;
  };
}

interface SessionData {
  abandon_at: number;
  client_id: string;
  created_at: number;
  expire_at: number;
  id: string;
  last_active_at: number;
  object: string;
  status: string;
  updated_at: number;
  user_id: string;
}

interface EventAttributes {
  http_request: HttpRequest;
}

interface HttpRequest {
  client_ip: string;
  user_agent: string;
}
