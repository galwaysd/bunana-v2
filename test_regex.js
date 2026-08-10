const text = "雨伞用防水布，190T涤塔夫，PU涂层";

// Test the fabric name regex
const fabricMatch = text.match(/(\d{2,4}[dDT]\s*[\u4e00-\u9fa5A-Za-z]{1,8}布|\d{2,4}[dDT]\s*[\u4e00-\u9fa5A-Za-z]{1,8}|春亚纺|涤塔夫|尼丝纺|塔丝隆|牛津布)/);
console.log("1. fabricMatch:", fabricMatch ? fabricMatch[0] : "null");

// Test the coating regex
const coatingMatch = text.match(/(PU|PA|PVC|TPU)\s*涂层/i);
console.log("2. coatingMatch:", coatingMatch ? coatingMatch[0] : "null");

// Test the use prefix regex
const usePrefixMatch = text.match(/([^，,。；!！\s]{2,12})?(?:用|用来)([^，,。；!！\s]{2,12})/);
console.log("3. usePrefixMatch:", usePrefixMatch ? [usePrefixMatch[1], usePrefixMatch[2]] : "null");

// Test waterproof
const waterproofMatch = /防水|防泼水|抗水/i.test(text);
console.log("4. waterproof:", waterproofMatch ? "防水要求高" : "null");
