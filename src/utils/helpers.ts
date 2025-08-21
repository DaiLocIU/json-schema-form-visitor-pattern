import { InputValueType } from "@/typings/inputValueType";

export const getTypeColor = (type: InputValueType): string => {
    const colors = {
      [InputValueType.STRING]: "text-green-600",
      [InputValueType.FLOAT]: "text-blue-500",
      [InputValueType.INTEGER]: "text-blue-700",
      [InputValueType.BOOLEAN]: "text-purple-600",
      [InputValueType.LIST]: "text-orange-500",
      [InputValueType.ARRAY]: "text-orange-700",
      [InputValueType.DICT]: "text-yellow-500",
      [InputValueType.IMAGE]: "text-pink-600",
      [InputValueType.JSON_SCHEMA]: "text-indigo-600",
      [InputValueType.BASE64_FILE]: "text-cyan-600",
      [InputValueType.DOCLING_DOCUMENT]: "text-gray-600",
      [InputValueType.KNOWLEDGE_BASE]: "text-emerald-600",
      [InputValueType.TOOLS]: "text-slate-600",
      [InputValueType.TOOL]: "text-slate-600",
      [InputValueType.WORKFLOW]: "text-violet-600",
      [InputValueType.STRUCT]: "text-gray-500", // Default color for STRUCT
    };
    return colors[type] || "text-gray-500";
};

export const getTypeBorderColor = (type: InputValueType): string => {
    const borderColors = {
      [InputValueType.STRING]: "border-green-300",
      [InputValueType.FLOAT]: "border-blue-300",
      [InputValueType.INTEGER]: "border-blue-300",
      [InputValueType.BOOLEAN]: "border-purple-300",
      [InputValueType.LIST]: "border-orange-300",
      [InputValueType.ARRAY]: "border-orange-300",
      [InputValueType.DICT]: "border-yellow-300",
      [InputValueType.IMAGE]: "border-pink-300",
      [InputValueType.JSON_SCHEMA]: "border-indigo-300",
      [InputValueType.BASE64_FILE]: "border-cyan-300",
      [InputValueType.DOCLING_DOCUMENT]: "border-gray-300",
      [InputValueType.KNOWLEDGE_BASE]: "border-emerald-300",
      [InputValueType.TOOLS]: "border-slate-300",
      [InputValueType.TOOL]: "border-slate-300",
      [InputValueType.WORKFLOW]: "border-violet-300",
      [InputValueType.STRUCT]: "border-gray-300", // Default border color for STRUCT
    };
    return borderColors[type] || "border-gray-300";
}

export const getTypeBackgroundColor = (type: InputValueType): string => {
    const backgroundColors = {
      [InputValueType.STRING]: "bg-green-50",
      [InputValueType.FLOAT]: "bg-blue-50",
      [InputValueType.INTEGER]: "bg-blue-50",
      [InputValueType.BOOLEAN]: "bg-purple-50",
      [InputValueType.LIST]: "bg-orange-50",
      [InputValueType.ARRAY]: "bg-orange-50",
      [InputValueType.DICT]: "bg-yellow-50",
      [InputValueType.IMAGE]: "bg-pink-50",
      [InputValueType.JSON_SCHEMA]: "bg-indigo-50",
      [InputValueType.BASE64_FILE]: "bg-cyan-50",
      [InputValueType.DOCLING_DOCUMENT]: "bg-gray-50",
      [InputValueType.KNOWLEDGE_BASE]: "bg-emerald-50",
      [InputValueType.TOOLS]: "bg-slate-50",
      [InputValueType.TOOL]: "bg-slate-50",
      [InputValueType.WORKFLOW]: "bg-violet-50",
      [InputValueType.STRUCT]: "bg-gray-50", // Default background color for STRUCT
    };
    return backgroundColors[type] || "bg-gray-50";
}
