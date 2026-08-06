import { notFound } from "next/navigation";

import { ProductApiTester } from "@/components/dev/product-api-tester";

export default function ProductTesterPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <ProductApiTester />;
}