export function convertToFormData(data: any): FormData {
    const formData = new FormData();
    
    // Add main materi fields
    formData.append('brand', data.brand);
    formData.append('cluster', data.cluster);
    formData.append('fitur', data.fitur);
    formData.append('nama_materi', data.nama_materi);
    formData.append('jenis', data.jenis);
    formData.append('start_date', data.start_date);
    formData.append('end_date', data.end_date);
    formData.append('periode', data.periode || '0');
    
    // Add dokumen materi
    if (data.dokumenMateri && Array.isArray(data.dokumenMateri)) {
      formData.append('dokumenMateriCount', data.dokumenMateri.length.toString());
      
      data.dokumenMateri.forEach((dokumen: any, index: number) => {
        formData.append(`dokumenMateri[${index}][linkDokumen]`, dokumen.linkDokumen || '');
        formData.append(`dokumenMateri[${index}][tipeMateri]`, dokumen.tipeMateri || '');
        
        if (dokumen.thumbnail && dokumen.thumbnail instanceof File) {
          formData.append(`dokumenMateri[${index}][thumbnail]`, dokumen.thumbnail);
        }
        
        // Convert keywords array to JSON string
        formData.append(`dokumenMateri[${index}][keywords]`, JSON.stringify(dokumen.keywords || []));
      });
    }
    
    return formData;
  }