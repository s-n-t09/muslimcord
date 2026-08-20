export type LocationOption = {
  id: string;
  label: string;
  query: string;
};

export const LOCATION_OPTIONS: LocationOption[] = [
  { id: "mecca", label: "مكة المكرمة — Mecca, Saudi Arabia", query: "Mecca, Saudi Arabia" },
  { id: "medina", label: "المدينة المنورة — Medina, Saudi Arabia", query: "Medina, Saudi Arabia" },
  { id: "jerusalem", label: "القدس — Jerusalem, Palestine", query: "Jerusalem" },
  { id: "cairo", label: "القاهرة — Cairo, Egypt", query: "Cairo, Egypt" },
  { id: "alexandria", label: "الإسكندرية — Alexandria, Egypt", query: "Alexandria, Egypt" },
  { id: "riyadh", label: "الرياض — Riyadh, Saudi Arabia", query: "Riyadh, Saudi Arabia" },
  { id: "jeddah", label: "جدة — Jeddah, Saudi Arabia", query: "Jeddah, Saudi Arabia" },
  { id: "dubai", label: "دبي — Dubai, UAE", query: "Dubai, United Arab Emirates" },
  { id: "abu-dhabi", label: "أبوظبي — Abu Dhabi, UAE", query: "Abu Dhabi, United Arab Emirates" },
  { id: "doha", label: "الدوحة — Doha, Qatar", query: "Doha, Qatar" },
  { id: "kuwait", label: "الكويت — Kuwait City, Kuwait", query: "Kuwait City, Kuwait" },
  { id: "manama", label: "المنامة — Manama, Bahrain", query: "Manama, Bahrain" },
  { id: "muscat", label: "مسقط — Muscat, Oman", query: "Muscat, Oman" },
  { id: "amman", label: "عمّان — Amman, Jordan", query: "Amman, Jordan" },
  { id: "beirut", label: "بيروت — Beirut, Lebanon", query: "Beirut, Lebanon" },
  { id: "damascus", label: "دمشق — Damascus, Syria", query: "Damascus, Syria" },
  { id: "baghdad", label: "بغداد — Baghdad, Iraq", query: "Baghdad, Iraq" },
  { id: "istanbul", label: "إسطنبول — Istanbul, Turkey", query: "Istanbul, Turkey" },
  { id: "casablanca", label: "الدار البيضاء — Casablanca, Morocco", query: "Casablanca, Morocco" },
  { id: "rabat", label: "الرباط — Rabat, Morocco", query: "Rabat, Morocco" },
  { id: "algiers", label: "الجزائر — Algiers, Algeria", query: "Algiers, Algeria" },
  { id: "tunis", label: "تونس — Tunis, Tunisia", query: "Tunis, Tunisia" },
  { id: "khartoum", label: "الخرطوم — Khartoum, Sudan", query: "Khartoum, Sudan" },
  { id: "mogadishu", label: "مقديشو — Mogadishu, Somalia", query: "Mogadishu, Somalia" },
  { id: "london", label: "لندن — London, United Kingdom", query: "London, United Kingdom" },
  { id: "paris", label: "باريس — Paris, France", query: "Paris, France" },
  { id: "berlin", label: "برلين — Berlin, Germany", query: "Berlin, Germany" },
  { id: "new-york", label: "نيويورك — New York, USA", query: "New York, USA" },
  { id: "toronto", label: "تورونتو — Toronto, Canada", query: "Toronto, Canada" },
  { id: "kuala-lumpur", label: "كوالالمبور — Kuala Lumpur, Malaysia", query: "Kuala Lumpur, Malaysia" },
  { id: "jakarta", label: "جاكرتا — Jakarta, Indonesia", query: "Jakarta, Indonesia" },
  { id: "karachi", label: "كراتشي — Karachi, Pakistan", query: "Karachi, Pakistan" },
  { id: "dhaka", label: "دكا — Dhaka, Bangladesh", query: "Dhaka, Bangladesh" },
];

export function searchLocations(query: string): LocationOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return LOCATION_OPTIONS;
  return LOCATION_OPTIONS.filter((option) => `${option.label} ${option.query}`.toLowerCase().includes(normalized));
}
