import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPartBySlug } from "../services/catalog.service.js";
import { formatGBP } from "../lib/formatters.js";

export default function PartDetailsPage() {
  const { slug } = useParams();
  const [part, setPart] = useState(null);

  useEffect(() => {
    fetchPartBySlug(slug).then(setPart).catch(console.error);
  }, [slug]);

  if (!part) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>{part.title}</h1>
      <p>{formatGBP(part.price)}</p>
      <p>{part.description}</p>
    </div>
  );
}
