const CURRICULUM = {
  "BSc Computer Science|100|1": ["CSC111", "CSC112"],
  "BSc Computer Science|100|2": ["CSC121", "CSC122"],
  "BSc Computer Science|200|1": ["CSC201"],
  "BSc Computer Science|400|2": ["CSC404"],
  "BSc Information Systems|300|2": ["INF302"],
  "BTech Network Engineering|300|1": ["NET305", "ENTR301"],
  "HND Networking|100|1": ["NET101", "NET102"],
  "HND Networking|100|2": ["NET110", "NET111"],
  "HND Networking|200|1": ["NET210", "NET211", "NET212"],
  "HND Networking|200|2": ["NET220", "NET221"],
  "BEng Electrical & Electronic|200|1": ["EEE203"],
  "BBA Accounting|100|1": ["ACC101"],
  "HND Information Technology|100|1": ["HTI101", "HTI102", "HTI103", "HTI104"],
  "HND Information Technology|100|2": ["HTI105", "HTI106", "HTI107", "HTI108"],
  "HND Information Technology|200|1": ["HTI201", "HTI202", "HTI203", "HTI204"],
  "HND Information Technology|200|2": ["HTI205", "HTI206", "HTI207", "HTI208"],
  "Professional Diploma in Information Technology|100|1": ["PDT101", "PDT102", "PDT103", "PDT104"],
  "Professional Diploma in Information Technology|100|2": ["PDT105", "PDT106", "PDT107", "PDT108"],
  "Professional Diploma in Information Technology|200|1": ["PDT201", "PDT202", "PDT203", "PDT204"],
  "Professional Diploma in Information Technology|200|2": ["PDT205", "PDT206", "PDT207", "PDT208"],
  "BTech Information Technology|200|1": ["BIT231", "BIT233", "BIT235", "BIT237", "BIT239", "BIT241", "BIT243", "BIT245"],
  "BTech Information Technology|200|2": ["BIT230", "BIT232", "BIT236", "BIT238", "BIT240", "BIT242"],
  "BTech Information Technology|300|1": ["BIT311", "BIT323", "BIT363", "BIT367"],
  "BTech Information Technology|300|2": ["BIT345", "BIT365", "BMS208", "DTM202", "DIA201"],
};

export function curriculumCourseCodes(programName, level, semester) {
  if (!programName) return [];
  return CURRICULUM[`${programName}|${level}|${semester}`] ?? [];
}