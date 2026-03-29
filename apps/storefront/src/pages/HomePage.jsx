import { Link } from "react-router-dom";

const fallbackCategories = [
  { id: 1, slug: "engine-parts", name: "Engine Parts", icon: "⚙️" },
  { id: 2, slug: "brakes", name: "Brakes & Rotors", icon: "🛑" },
  { id: 3, slug: "suspension", name: "Suspension & Steering", icon: "🔩" },
  { id: 4, slug: "electrical", name: "Electrical & Lighting", icon: "💡" },
  { id: 5, slug: "filters", name: "Filters & Fluids", icon: "🧴" },
  { id: 6, slug: "cooling", name: "Cooling System", icon: "❄️" },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-20 px-4">
        <div className="container-app text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find the Right Part,<br />Every Time.
          </h1>

          <p className="text-blue-200 text-lg mb-8">
            UK-focused auto parts marketplace with prices prepared for Pound Sterling.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/parts"
              className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition"
            >
              Browse Parts
            </Link>

            <Link
              to="/vehicle-selector"
              className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white/10 transition"
            >
              Select Vehicle
            </Link>
          </div>
        </div>
      </section>

      <section className="container-app py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Shop by Category</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {fallbackCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/categories/${cat.slug}`}
              className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 border border-transparent transition text-center"
            >
              <span className="text-3xl mb-2">{cat.icon}</span>
              <span className="text-sm font-medium text-gray-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-gray-900 text-white py-16">
        <div className="container-app flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold mb-3">Sell Auto Parts on PartHub UK</h2>
            <p className="text-gray-400">
              Reach buyers across Great Britain with clean structured listings.
            </p>
          </div>

          <a
            href="https://seller.parthub.site"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-500 transition shrink-0"
          >
            Start Selling →
          </a>
        </div>
      </section>
    </div>
  );
}
