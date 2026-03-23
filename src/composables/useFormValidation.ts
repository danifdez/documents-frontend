import { ref, reactive, computed } from 'vue';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

type ValidationRules = Record<string, ValidationRule>;

export function useFormValidation(rules: ValidationRules) {
  const errors = reactive<Record<string, string | null>>({});
  const touched = reactive<Record<string, boolean>>({});

  // Initialize error state for all fields
  for (const field of Object.keys(rules)) {
    errors[field] = null;
    touched[field] = false;
  }

  function validateField(field: string, value: any): string | null {
    const rule = rules[field];
    if (!rule) return null;

    const strValue = value == null ? '' : String(value).trim();

    if (rule.required && !strValue) {
      return `${field} is required`;
    }
    if (rule.minLength && strValue.length < rule.minLength) {
      return `${field} must be at least ${rule.minLength} characters`;
    }
    if (rule.maxLength && strValue.length > rule.maxLength) {
      return `${field} must be at most ${rule.maxLength} characters`;
    }
    if (rule.pattern && !rule.pattern.test(strValue)) {
      return `${field} format is invalid`;
    }
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  function touch(field: string, value: any) {
    touched[field] = true;
    errors[field] = validateField(field, value);
  }

  function validate(values: Record<string, any>): boolean {
    let valid = true;
    for (const [field, rule] of Object.entries(rules)) {
      touched[field] = true;
      const error = validateField(field, values[field]);
      errors[field] = error;
      if (error) valid = false;
    }
    return valid;
  }

  function reset() {
    for (const field of Object.keys(rules)) {
      errors[field] = null;
      touched[field] = false;
    }
  }

  const isValid = computed(() => Object.values(errors).every((e) => e === null));
  const hasErrors = computed(() => Object.values(errors).some((e) => e !== null));

  return { errors, touched, touch, validate, reset, isValid, hasErrors };
}
