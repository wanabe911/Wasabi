const PREFIX_DB = {
  "0811": { operator: "Telkomsel", jenis: "Pascabayar", wilayah: "Nasional" },
  "0812": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0813": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0821": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0822": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0823": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0851": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0852": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0853": { operator: "Telkomsel", jenis: "Prabayar", wilayah: "Nasional" },
  "0814": { operator: "Indosat", jenis: "Prabayar", wilayah: "Nasional" },
  "0815": { operator: "Indosat", jenis: "Prabayar", wilayah: "Nasional" },
  "0816": { operator: "Indosat", jenis: "Prabayar", wilayah: "Nasional" },
  "0855": { operator: "Indosat", jenis: "Prabayar", wilayah: "Nasional" },
  "0856": { operator: "Indosat", jenis: "Prabayar", wilayah: "Nasional" },
  "0857": { operator: "Indosat", jenis: "Prabayar", wilayah: "Nasional" },
  "0858": { operator: "Indosat", jenis: "Prabayar", wilayah: "Nasional" },
  "0817": { operator: "XL", jenis: "Prabayar", wilayah: "Nasional" },
  "0818": { operator: "XL", jenis: "Prabayar", wilayah: "Nasional" },
  "0819": { operator: "XL", jenis: "Prabayar", wilayah: "Nasional" },
  "0859": { operator: "XL", jenis: "Prabayar", wilayah: "Nasional" },
  "0877": { operator: "XL", jenis: "Prabayar", wilayah: "Nasional" },
  "0878": { operator: "XL", jenis: "Prabayar", wilayah: "Nasional" },
  "0895": { operator: "Three", jenis: "Prabayar", wilayah: "Nasional" },
  "0896": { operator: "Three", jenis: "Prabayar", wilayah: "Nasional" },
  "0897": { operator: "Three", jenis: "Prabayar", wilayah: "Nasional" },
  "0898": { operator: "Three", jenis: "Prabayar", wilayah: "Nasional" },
  "0899": { operator: "Three", jenis: "Prabayar", wilayah: "Nasional" },
  "0831": { operator: "AXIS", jenis: "Prabayar", wilayah: "Nasional" },
  "0832": { operator: "AXIS", jenis: "Prabayar", wilayah: "Nasional" },
  "0833": { operator: "AXIS", jenis: "Prabayar", wilayah: "Nasional" },
  "0838": { operator: "AXIS", jenis: "Prabayar", wilayah: "Nasional" },
  "0881": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0882": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0883": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0884": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0885": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0886": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0887": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0888": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" },
  "0889": { operator: "Smartfren", jenis: "Prabayar", wilayah: "Nasional" }
};

export function lookupPrefix(phone) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const prefix = cleaned.slice(0, 4);
  return PREFIX_DB[prefix] || { operator: "Tidak dikenal", jenis: "Tidak diketahui", wilayah: "Tidak diketahui" };
}
