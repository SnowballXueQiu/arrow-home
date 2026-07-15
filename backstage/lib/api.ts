const BASE = "/api/backend";

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

export const bulkImportProducts = (items: Partial<Product>[]) =>
  api.post<{ imported: number; skipped: number; errors: string[] }>("/products/import", items);

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

// ---------- Export / Import ----------

export interface ExportData {
  version: 2;
  exported_at: string;
  categories: {
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
  }[];
  products: (Product & {
    attributes: { key: string; value: string; sort_order: number }[];
    variants: { variant_type: string; variant_value: string; sort_order: number }[];
    images: { url: string; sort_order: number }[];
  })[];
  banners: {
    title: string;
    subtitle: string;
    tag: string;
    image_url: string;
    sort_order: number;
    is_active: number;
  }[];
  announcements: {
    content: string;
    is_active: boolean;
  }[];
  company: Partial<CompanyInfo>;
  cases: {
    name: string;
    sort_order: number;
    is_active: boolean;
    images: string[];
    descriptions: string[];
  }[];
}

// ---------- Company / Cases ----------

export interface CompanyInfo {
  id: number;
  company_name: string;
  slogan: string;
  description: string;
  phone: string;
  address: string;
  email: string;
  wechat: string;
  updated_at?: string;
}

export interface ProjectCase {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  images: { id: number; url: string; sort_order: number }[];
  descriptions: { id: number; content: string; sort_order: number }[];
}

export const fetchCompany = () => api.get<CompanyInfo>("/company");
export const updateCompany = (data: Partial<CompanyInfo>) => api.put<{ ok: boolean }>("/company", data);

export const fetchCases = () => api.get<ProjectCase[]>("/cases");
export const createCase = (data: { name: string; sort_order?: number; is_active?: boolean; images: string[]; descriptions: string[] }) =>
  api.post<{ id: number }>("/cases", data);
export const updateCase = (id: number, data: { name?: string; sort_order?: number; is_active?: boolean; images?: string[]; descriptions?: string[] }) =>
  api.put<{ ok: boolean }>(`/cases/${id}`, data);
export const deleteCase = (id: number) => api.delete<{ ok: boolean }>(`/cases/${id}`);

export async function exportAllData(
  onProgress?: (current: number, total: number) => void
): Promise<ExportData> {
  // 1. categories
  const categories = await api.get<(Category & { product_count?: number })[]>("/categories?flat=true");

  // 2. products (paginated)
  const firstPage = await api.get<ProductListResponse>("/products?page=1&page_size=1000");
  let allBasic = firstPage.items;
  const totalPages = Math.ceil(firstPage.total / 1000);
  for (let p = 2; p <= totalPages; p++) {
    const r = await api.get<ProductListResponse>(`/products?page=${p}&page_size=1000`);
    allBasic = allBasic.concat(r.items);
  }

  // 3. product detail
  const products: ExportData["products"] = [];
  for (let i = 0; i < allBasic.length; i++) {
    onProgress?.(i, allBasic.length);
    const full = await api.get<Product>(`/products/${allBasic[i].id}`);
    products.push(full as ExportData["products"][number]);
  }
  onProgress?.(allBasic.length, allBasic.length);

  // 4. banners, announcements, company, cases
  const banners = await api.get<Banner[]>("/banners");
  const announcements = await api.get<{ id: number; content: string; is_active: boolean }[]>("/announcements");
  const company = await api.get<CompanyInfo>("/company");
  const cases = await api.get<ProjectCase[]>("/cases");

  return {
    version: 2,
    exported_at: new Date().toISOString(),
    categories: categories.map(({ id, name, parent_id, sort_order }) => ({ id, name, parent_id, sort_order })),
    products,
    banners: banners.map(({ title, subtitle, tag, image_url, sort_order, is_active }) => ({
      title, subtitle, tag, image_url, sort_order, is_active,
    })),
    announcements: announcements.map(({ content, is_active }) => ({ content, is_active })),
    company: (({ id: _id, updated_at: _u, ...rest }) => rest)(company),
    cases: cases.map((c) => ({
      name: c.name,
      sort_order: c.sort_order,
      is_active: c.is_active,
      images: c.images.map((i) => i.url),
      descriptions: c.descriptions.map((d) => d.content),
    })),
  };
}
