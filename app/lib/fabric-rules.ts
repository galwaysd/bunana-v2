import type { FabricDNA, FieldSource } from "@/app/types";

/**
 * Declarative Fabric DNA know-how only.
 *
 * This module is intentionally not imported by the current product runtime.
 * A future workflow integration must be approved separately before these rules
 * are allowed to affect AI output, confirmation, follow-up, or matching.
 */

export const FABRIC_RULESET_VERSION = "fabric-dna-know-how-v1" as const;

export type FabricRulePriority = 0 | 1 | 2 | 3;

export type FabricImageCondition =
  | "usable_image_quality"
  | "neutral_lighting"
  | "reliable_white_balance"
  | "close_range"
  | "surface_in_focus"
  | "surface_unobstructed"
  | "multiple_angles"
  | "visible_functional_evidence"
  | "sufficient_context";

export type FabricRuleApplicability =
  | "surface_treatment_relevant"
  | "water_resistance_relevant"
  | "feature_specific_matching_relevant"
  | "cross_border_or_compliance_relevant";

export type FabricConfirmationCondition =
  | "ambiguous_text"
  | "image_requirements_unmet"
  | "no_explicit_user_or_supplier_statement"
  | "no_measurement_or_specification";

export type FabricImageReadability = {
  level: "observable" | "suggestive" | "none";
  requires?: readonly FabricImageCondition[];
};

export type FabricConfirmationPolicy =
  | { mode: "optional" }
  | { mode: "required" }
  | {
      mode: "conditional";
      requiredForSources?: readonly FieldSource[];
      when?: readonly FabricConfirmationCondition[];
    };

export type FabricFieldRule = {
  imageReadability: FabricImageReadability;
  /** Ordered from the preferred source to the least-preferred allowed source. */
  allowedSources: readonly FieldSource[];
  /** Maximum confidence a source may receive, never a default confidence. */
  confidenceCap: Readonly<Partial<Record<FieldSource, number>>>;
  confirmationPolicy: FabricConfirmationPolicy;
  askWhenMissing: boolean;
  questionPriority: FabricRulePriority;
  businessMatchingPriority: FabricRulePriority;
  visualSimilarityPriority: FabricRulePriority;
  applicableConditions?: readonly FabricRuleApplicability[];
};

export const FABRIC_FIELD_RULES = {
  fabricName: {
    imageReadability: {
      level: "suggestive",
      requires: ["usable_image_quality", "sufficient_context"]
    },
    allowedSources: ["user_input", "text_extraction", "image_analysis", "inference"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95,
      image_analysis: 0.7,
      inference: 0.6
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["image_analysis", "inference"],
      when: ["ambiguous_text", "image_requirements_unmet"]
    },
    askWhenMissing: true,
    questionPriority: 3,
    businessMatchingPriority: 2,
    visualSimilarityPriority: 1
  },
  use: {
    imageReadability: {
      level: "suggestive",
      requires: ["usable_image_quality", "sufficient_context"]
    },
    allowedSources: ["user_input", "text_extraction", "inference", "image_analysis"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95,
      inference: 0.6,
      image_analysis: 0.55
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["image_analysis", "inference"],
      when: ["ambiguous_text", "image_requirements_unmet"]
    },
    askWhenMissing: true,
    questionPriority: 3,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 0
  },
  composition: {
    imageReadability: {
      level: "suggestive",
      requires: ["usable_image_quality", "close_range", "surface_in_focus"]
    },
    allowedSources: ["user_input", "text_extraction", "image_analysis", "inference"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.9,
      image_analysis: 0.4,
      inference: 0.35
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["image_analysis", "inference"],
      when: ["ambiguous_text", "no_explicit_user_or_supplier_statement"]
    },
    askWhenMissing: true,
    questionPriority: 3,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 0
  },
  weave: {
    imageReadability: {
      level: "observable",
      requires: [
        "usable_image_quality",
        "close_range",
        "surface_in_focus",
        "surface_unobstructed"
      ]
    },
    allowedSources: ["user_input", "text_extraction", "image_analysis", "inference"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95,
      image_analysis: 0.8,
      inference: 0.5
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["inference"],
      when: ["ambiguous_text", "image_requirements_unmet"]
    },
    askWhenMissing: true,
    questionPriority: 2,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 3
  },
  weightGsm: {
    imageReadability: { level: "none" },
    allowedSources: ["user_input", "text_extraction"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.9
    },
    confirmationPolicy: {
      mode: "conditional",
      when: ["ambiguous_text", "no_measurement_or_specification"]
    },
    askWhenMissing: true,
    questionPriority: 3,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 0
  },
  width: {
    imageReadability: { level: "none" },
    allowedSources: ["user_input", "text_extraction"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95
    },
    confirmationPolicy: {
      mode: "conditional",
      when: ["ambiguous_text", "no_measurement_or_specification"]
    },
    askWhenMissing: true,
    questionPriority: 2,
    businessMatchingPriority: 2,
    visualSimilarityPriority: 0
  },
  coating: {
    imageReadability: {
      level: "suggestive",
      requires: [
        "usable_image_quality",
        "close_range",
        "surface_in_focus",
        "multiple_angles"
      ]
    },
    allowedSources: ["user_input", "text_extraction", "image_analysis", "inference"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.9,
      image_analysis: 0.55,
      inference: 0.35
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["image_analysis", "inference"],
      when: ["ambiguous_text", "image_requirements_unmet"]
    },
    askWhenMissing: true,
    questionPriority: 2,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 1,
    applicableConditions: ["surface_treatment_relevant"]
  },
  waterproof: {
    imageReadability: {
      level: "suggestive",
      requires: ["usable_image_quality", "visible_functional_evidence"]
    },
    allowedSources: ["user_input", "text_extraction", "image_analysis", "inference"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.9,
      image_analysis: 0.45,
      inference: 0.3
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["image_analysis", "inference"],
      when: ["ambiguous_text", "image_requirements_unmet"]
    },
    askWhenMissing: true,
    questionPriority: 2,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 0,
    applicableConditions: ["water_resistance_relevant"]
  },
  moq: {
    imageReadability: { level: "none" },
    allowedSources: ["user_input", "text_extraction"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95
    },
    confirmationPolicy: {
      mode: "conditional",
      when: ["ambiguous_text", "no_explicit_user_or_supplier_statement"]
    },
    askWhenMissing: true,
    questionPriority: 3,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 0
  },
  quantity: {
    imageReadability: { level: "none" },
    allowedSources: ["user_input", "text_extraction"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95
    },
    confirmationPolicy: {
      mode: "conditional",
      when: ["ambiguous_text", "no_explicit_user_or_supplier_statement"]
    },
    askWhenMissing: true,
    questionPriority: 3,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 0
  },
  destinationMarket: {
    imageReadability: { level: "none" },
    allowedSources: ["user_input", "text_extraction"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95
    },
    confirmationPolicy: {
      mode: "conditional",
      when: ["ambiguous_text", "no_explicit_user_or_supplier_statement"]
    },
    askWhenMissing: true,
    questionPriority: 2,
    businessMatchingPriority: 2,
    visualSimilarityPriority: 0,
    applicableConditions: ["cross_border_or_compliance_relevant"]
  },
  leadTime: {
    imageReadability: { level: "none" },
    allowedSources: ["user_input", "text_extraction"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95
    },
    confirmationPolicy: {
      mode: "conditional",
      when: ["ambiguous_text", "no_explicit_user_or_supplier_statement"]
    },
    askWhenMissing: true,
    questionPriority: 3,
    businessMatchingPriority: 3,
    visualSimilarityPriority: 0
  },
  color: {
    imageReadability: {
      level: "observable",
      requires: [
        "usable_image_quality",
        "neutral_lighting",
        "reliable_white_balance",
        "surface_unobstructed"
      ]
    },
    allowedSources: ["user_input", "text_extraction", "image_analysis", "inference"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.95,
      image_analysis: 0.85,
      inference: 0.5
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["inference"],
      when: ["ambiguous_text", "image_requirements_unmet"]
    },
    askWhenMissing: true,
    questionPriority: 2,
    businessMatchingPriority: 2,
    visualSimilarityPriority: 3
  },
  features: {
    imageReadability: {
      level: "suggestive",
      requires: [
        "usable_image_quality",
        "surface_in_focus",
        "visible_functional_evidence"
      ]
    },
    allowedSources: ["user_input", "text_extraction", "image_analysis", "inference"],
    confidenceCap: {
      user_input: 1,
      text_extraction: 0.9,
      image_analysis: 0.6,
      inference: 0.45
    },
    confirmationPolicy: {
      mode: "conditional",
      requiredForSources: ["image_analysis", "inference"],
      when: ["ambiguous_text", "image_requirements_unmet"]
    },
    askWhenMissing: true,
    questionPriority: 1,
    businessMatchingPriority: 2,
    visualSimilarityPriority: 1,
    applicableConditions: ["feature_specific_matching_relevant"]
  }
} as const satisfies Readonly<Record<keyof FabricDNA, FabricFieldRule>>;
