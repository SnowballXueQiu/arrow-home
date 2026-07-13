const BASE = "/backend";

function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  // Read from cookie directly (no js-cookie needed server-side)
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "请求失败" }));
    throw new Error(err.detail ?? "请求失败");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ---------- Types ----------

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  children?: Category[];
}

export interface ProductAttribute {
  key: string;
  value: string;
  sort_order: number;
}

export interface ProductVariant {
  variant_type: string;
  variant_value: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  model: string;
  // model is the primary display identifier; name is optional/legacy
  description: string;
  category_id: number | null;
  category_name?: string;
  is_hot: boolean;
  sort_order: number;
  price: number | null;
  discount_price: number | null;
  show_price: boolean;
  created_at: string;
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  images?: { url: string; sort_order: number }[];
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  page_size: number;
  total: number;
}

// ---------- Category APIs ----------

export const fetchCategories = () =>
  api.get<Category[]>("/categories?flat=true");

export const fetchCategoryTree = () => api.get<Category[]>("/categories");

export const createCategory = (data: {
  name: string;
  parent_id: number | null;
  sort_order: number;
}) => api.post<{ id: number }>("/categories", data);

export const deleteCategory = (id: number) =>
  api.delete<{ ok: boolean }>(`/categories/${id}`);

// ---------- Product APIs ----------

export const fetchProducts = (params: {
  page?: number;
  page_size?: number;
  category_id?: number;
  keyword?: string;
  sort_by?: string;
  sort_dir?: string;
}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));
  if (params.category_id) q.set("category_id", String(params.category_id));
  if (params.keyword) q.set("keyword", params.keyword);
  if (params.sort_by) q.set("sort_by", params.sort_by);
  if (params.sort_dir) q.set("sort_dir", params.sort_dir);
  return api.get<ProductListResponse>(`/products?${q.toString()}`);
};

export const fetchCategoryProducts = (catId: number) =>
  api.get<{ id: number; model: string; name: string; is_hot: number }[]>(
    `/categories/${catId}/products`
  );

export const fetchProduct = (id: number) =>
  api.get<Product>(`/products/${id}`);

export const createProduct = (data: Partial<Product>) =>
  api.post<{ id: number }>("/products", data);

export const updateProduct = (id: number, data: Partial<Product>) =>
  api.put<{ ok: boolean }>(`/products/${id}`, data);

export const deleteProduct = (id: number) =>
  api.delete<{ ok: boolean }>(`/products/${id}`);

// ---------- Banners / Announcements ----------

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  tag: string;
  image_url: string;
  sort_order: number;
  is_active: number;
}

export const fetchBanners = () => api.get<Banner[]>("/banners");
export const deleteBanner = (id: number) =>
  api.delete<{ ok: boolean }>(`/banners/${id}`);
