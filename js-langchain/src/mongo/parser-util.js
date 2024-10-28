const customJsonParser = (jsonString) => {
  // Define regex to match both new Date(...) patterns
  const dateRegex = /new Date\(([^)]*)\)/g;
  const staticDateRegex = /new Date\("([^\"]+)"\)/g;

  // Replace the new Date(...) pattern with a placeholder
  let parsedString = jsonString.replace(staticDateRegex, (match, p1) => {
    return `"__DATE__${p1}__DATE__"`;
  });

  // Replace the new Date(...) pattern with a placeholder
  parsedString = parsedString.replace(dateRegex, (match, p1) => {
    return `"__DATE_EXPR__${p1}__DATE_EXPR__"`;
  });

  // Parse the JSON string
  const parsedJson = JSON.parse(parsedString, (key, value) => {
    // Check if the value is a static date placeholder
    if (typeof value === 'string' && value.startsWith('__DATE__') && value.endsWith('__DATE__')) {
      const dateString = value.slice(8, -8);
      return new Date(dateString);
    }
    // Check if the value is a dynamic date expression placeholder
    if (typeof value === 'string' && value.startsWith('__DATE_EXPR__') && value.endsWith('__DATE_EXPR__')) {
      const dateExpression = value.slice(13, -13);
      // Evaluate the date expression to get the Date object
      return eval(`new Date(${dateExpression})`);
    }
    return value;
  });

  return parsedJson;
};

// Example usages
const jsonString1 = `{ "updated-time": { "$gte": new Date(new Date().getTime() - 24 * 60 * 60 * 1000) } }`;
const jsonString2 = `{ "updated-time": { "$gte": new Date("2022-10-15T00:00:00.000Z") } }`;

const parsedJson1 = customJsonParser(jsonString1);
const parsedJson2 = customJsonParser(jsonString2);

console.log(parsedJson1);
console.log(parsedJson2);