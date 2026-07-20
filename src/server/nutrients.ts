import { NutrientItem } from '../types';

export function calculateNutrients(profile: {
  age: number;
  gender: string;
  height: number;
  weight: number;
  activity_level: string;
  pregnancy_status?: string;
}) {
  const { age, gender, height, weight, activity_level, pregnancy_status = 'none' } = profile;

  // Calculate BMI
  const heightM = height / 100;
  const bmi = heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : 0;

  // Mifflin-St Jeor Equation for BMR
  let bmr = 0;
  if (gender.toLowerCase() === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Adjust for pregnancy/lactation
  if (pregnancy_status === 'pregnant') {
    bmr += 300;
  } else if (pregnancy_status === 'lactating') {
    bmr += 500;
  }

  // Activity Factor Multipliers
  let activityFactor = 1.2;
  switch (activity_level.toLowerCase()) {
    case 'sedentary':
      activityFactor = 1.2;
      break;
    case 'lightly_active':
      activityFactor = 1.375;
      break;
    case 'moderately_active':
      activityFactor = 1.55;
      break;
    case 'very_active':
      activityFactor = 1.725;
      break;
    default:
      activityFactor = 1.2;
  }

  const calories = Math.round(bmr * activityFactor);

  // Macros Calculation
  // Protein: 1.2g to 2.0g per kg depending on activity
  let proteinPerKg = 1.2;
  if (activity_level === 'very_active') proteinPerKg = 1.8;
  else if (activity_level === 'moderately_active') proteinPerKg = 1.5;
  const proteinG = Math.round(weight * proteinPerKg);

  // Fat: 25% of total calories
  const fatG = Math.round((calories * 0.25) / 9);

  // Carbs: Remaining calories
  const carbsG = Math.round((calories - (proteinG * 4 + fatG * 9)) / 4);

  // Fiber: 14g per 1000 calories
  const fiberG = Math.round((calories / 1000) * 14);

  // Water: 35ml per kg of body weight
  const waterL = Number(((weight * 35) / 1000).toFixed(1));

  // Micro-nutrient calculations based on age, gender, pregnancy
  const isFemale = gender.toLowerCase() === 'female';
  const isPregnant = pregnancy_status === 'pregnant';
  const isLactating = pregnancy_status === 'lactating';

  // Vitamin A (mcg RAE)
  let vitA = isFemale ? 700 : 900;
  if (isPregnant) vitA = 770;
  if (isLactating) vitA = 1300;

  // Vitamin B12 (mcg)
  let vitB12 = 2.4;
  if (isPregnant) vitB12 = 2.6;
  if (isLactating) vitB12 = 2.8;

  // Vitamin C (mg)
  let vitC = isFemale ? 75 : 90;
  if (isPregnant) vitC = 85;
  if (isLactating) vitC = 120;

  // Vitamin D (mcg)
  const vitD = 15; // 600 IU

  // Iron (mg)
  let iron = isFemale ? 18 : 8;
  if (age > 50 && isFemale) iron = 8;
  if (isPregnant) iron = 27;
  if (isLactating) iron = 9;

  // Calcium (mg)
  const calcium = age > 50 && isFemale ? 1200 : 1000;

  // Magnesium (mg)
  let magnesium = isFemale ? 310 : 400;
  if (isPregnant) magnesium = 350;

  // Potassium (mg)
  const potassium = isFemale ? 2600 : 3400;

  // Sodium (mg)
  const sodium = 1500; // Target

  // Omega 3 (g)
  const omega3 = isFemale ? 1.1 : 1.6;

  // Folate (mcg DFE)
  let folate = 400;
  if (isPregnant) folate = 600;
  if (isLactating) folate = 500;

  // Zinc (mg)
  let zinc = isFemale ? 8 : 11;
  if (isPregnant) zinc = 11;
  if (isLactating) zinc = 12;

  const nutrients: NutrientItem[] = [
    { name: 'Calories', value: `${calories}`, status: 'Adequate', unit: 'kcal', category: 'Macro' },
    { name: 'Protein', value: `${proteinG}`, status: 'Adequate', unit: 'g', category: 'Macro' },
    { name: 'Carbohydrates', value: `${carbsG}`, status: 'Adequate', unit: 'g', category: 'Macro' },
    { name: 'Fat', value: `${fatG}`, status: 'Adequate', unit: 'g', category: 'Macro' },
    { name: 'Fiber', value: `${fiberG}`, status: 'Adequate', unit: 'g', category: 'Macro' },
    { name: 'Water Intake', value: `${waterL}`, status: 'Adequate', unit: 'L', category: 'Macro' },
    { name: 'Vitamin A', value: `${vitA}`, status: 'Adequate', unit: 'mcg', category: 'Vitamins' },
    { name: 'Vitamin B12', value: `${vitB12}`, status: 'Adequate', unit: 'mcg', category: 'Vitamins' },
    { name: 'Vitamin C', value: `${vitC}`, status: 'Adequate', unit: 'mg', category: 'Vitamins' },
    { name: 'Vitamin D', value: `${vitD}`, status: 'Adequate', unit: 'mcg', category: 'Vitamins' },
    { name: 'Folate', value: `${folate}`, status: 'Adequate', unit: 'mcg', category: 'Vitamins' },
    { name: 'Iron', value: `${iron}`, status: 'Adequate', unit: 'mg', category: 'Minerals' },
    { name: 'Calcium', value: `${calcium}`, status: 'Adequate', unit: 'mg', category: 'Minerals' },
    { name: 'Magnesium', value: `${magnesium}`, status: 'Adequate', unit: 'mg', category: 'Minerals' },
    { name: 'Potassium', value: `${potassium}`, status: 'Adequate', unit: 'mg', category: 'Minerals' },
    { name: 'Sodium', value: `${sodium}`, status: 'Adequate', unit: 'mg', category: 'Minerals' },
    { name: 'Zinc', value: `${zinc}`, status: 'Adequate', unit: 'mg', category: 'Minerals' },
    { name: 'Omega-3', value: `${omega3}`, status: 'Adequate', unit: 'g', category: 'Macro' },
  ];

  return { bmi, nutrients, calories };
}
