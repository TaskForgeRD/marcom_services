export default function parseFiltersFromQuery(query: any) {
  return {
    search: (query.search as string) || "",
    status: (query.status as string) || "",
    brand: (query.brand as string) || "",
    cluster: (query.cluster as string) || "",
    fitur: (query.fitur as string) || "",
    jenis: (query.jenis as string) || "",
    start_date: (query.start_date as string) || "",
    end_date: (query.end_date as string) || "",
    only_visual_docs: query.only_visual_docs === "true",
  };
}
