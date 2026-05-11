
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  thumbnail: string;
  images?: string[];
  preview_file_url?: string; // ملف للعرض (مجاني)
  sale_file_url: string;    // ملف للبيع (بعد الدفع)
  external_link?: string;
  category: string;
  created_at: number;
}

export interface Order {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  buyer_name: string;
  buyer_phone: string;
  receipt_image: string;
  status: 'pending' | 'approved' | 'rejected';
  sale_file_url?: string;
  timestamp: number;
}

export interface SpecialRequest {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  specifications: string;
  receipt_image?: string;
  status: 'pending_payment' | 'processing' | 'delivered' | 'rejected';
  delivery_file_url?: string;
  timestamp: number;
}

export interface SellerSettings {
  id?: number;
  bank_name: string;
  account_holder: string;
  account_number: string;
  iban: string;
  phone_number: string;
}
