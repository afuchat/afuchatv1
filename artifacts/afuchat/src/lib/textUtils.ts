/**
 * Safely converts any value to a string for display.
 * Handles objects, arrays, null, undefined, and ensures proper text rendering.
 */
export function toSafeString(value: any): string {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return '';
  }

  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }

  // Handle numbers and booleans
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(toSafeString).join(', ');
  }

  // Handle objects - try to extract meaningful text
  if (typeof value === 'object') {
    // Check for common text properties
    if ('text' in value && value.text) {
      return toSafeString(value.text);
    }
    if ('value' in value && value.value) {
      return toSafeString(value.value);
    }
    if ('title' in value && value.title) {
      return toSafeString(value.title);
    }
    if ('content' in value && value.content) {
      return toSafeString(value.content);
    }
    if ('description' in value && value.description) {
      return toSafeString(value.description);
    }
    if ('name' in value && value.name) {
      return toSafeString(value.name);
    }
    
    // If object has only one property, try to use its value
    const keys = Object.keys(value);
    if (keys.length === 1) {
      return toSafeString(value[keys[0]]);
    }
    
    // Last resort: JSON stringify (but avoid circular references)
    try {
      return JSON.stringify(value);
    } catch {
      return '[Complex Object]';
    }
  }

  // Fallback
  return String(value);
}

/**
 * Safely extracts text from potentially nested objects.
 * Useful for fields like title.title or description.description
 */
export function extractText(value: any): string {
  if (!value) return '';
  
  // If it's a string, return it
  if (typeof value === 'string') return value;
  
  // Handle nested properties (e.g., title.title, description.description)
  const stringValue = typeof value === 'object' ? toSafeString(value) : String(value);
  
  return stringValue;
}

/**
 * Ensures a React node or any value can be safely rendered as text
 */
export function toRenderableText(value: any): string | React.ReactNode {
  if (value === null || value === undefined) {
    return '';
  }

  // React nodes can be rendered directly
  if (typeof value === 'object' && '$$typeof' in value) {
    return value;
  }

  return toSafeString(value);
}
