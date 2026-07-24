"use strict";

// A curated "major cities per country" seed, not a full world-cities import
// (a genuinely complete dataset is tens of thousands of rows and would
// realistically come from a public geographic dataset like GeoNames at
// implementation time — see user-stories/018-trip-creation.md's Open
// Questions). This covers ~48 countries and ~200 well-known major cities,
// enough to exercise the searchable dropdown and filters meaningfully.
const COUNTRIES_WITH_CITIES = [
  { name: "India", code: "IN", cities: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Surat", "Lucknow", "Chandigarh"] },
  { name: "United States", code: "US", cities: ["New York", "Los Angeles", "Chicago", "Houston", "San Francisco", "Miami", "Boston", "Seattle"] },
  { name: "United Kingdom", code: "GB", cities: ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Liverpool"] },
  { name: "Canada", code: "CA", cities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"] },
  { name: "Australia", code: "AU", cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"] },
  { name: "Germany", code: "DE", cities: ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"] },
  { name: "France", code: "FR", cities: ["Paris", "Lyon", "Marseille", "Nice", "Toulouse"] },
  { name: "Italy", code: "IT", cities: ["Rome", "Milan", "Venice", "Florence", "Naples"] },
  { name: "Spain", code: "ES", cities: ["Madrid", "Barcelona", "Valencia", "Seville"] },
  { name: "Netherlands", code: "NL", cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"] },
  { name: "Japan", code: "JP", cities: ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya"] },
  { name: "China", code: "CN", cities: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu"] },
  { name: "Singapore", code: "SG", cities: ["Singapore"] },
  { name: "United Arab Emirates", code: "AE", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { name: "Saudi Arabia", code: "SA", cities: ["Riyadh", "Jeddah", "Mecca", "Dammam"] },
  { name: "South Africa", code: "ZA", cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria"] },
  { name: "Brazil", code: "BR", cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"] },
  { name: "Mexico", code: "MX", cities: ["Mexico City", "Guadalajara", "Monterrey", "Cancún"] },
  { name: "Russia", code: "RU", cities: ["Moscow", "Saint Petersburg", "Novosibirsk"] },
  { name: "South Korea", code: "KR", cities: ["Seoul", "Busan", "Incheon"] },
  { name: "Indonesia", code: "ID", cities: ["Jakarta", "Surabaya", "Denpasar", "Bandung"] },
  { name: "Thailand", code: "TH", cities: ["Bangkok", "Phuket", "Chiang Mai", "Pattaya"] },
  { name: "Malaysia", code: "MY", cities: ["Kuala Lumpur", "Penang", "Johor Bahru"] },
  { name: "Philippines", code: "PH", cities: ["Manila", "Cebu", "Davao"] },
  { name: "Vietnam", code: "VN", cities: ["Ho Chi Minh City", "Hanoi", "Da Nang"] },
  { name: "Egypt", code: "EG", cities: ["Cairo", "Alexandria", "Giza"] },
  { name: "Nigeria", code: "NG", cities: ["Lagos", "Abuja", "Kano"] },
  { name: "Kenya", code: "KE", cities: ["Nairobi", "Mombasa"] },
  { name: "Turkey", code: "TR", cities: ["Istanbul", "Ankara", "Izmir", "Antalya"] },
  { name: "Switzerland", code: "CH", cities: ["Zurich", "Geneva", "Basel", "Bern"] },
  { name: "Sweden", code: "SE", cities: ["Stockholm", "Gothenburg", "Malmö"] },
  { name: "Norway", code: "NO", cities: ["Oslo", "Bergen"] },
  { name: "Denmark", code: "DK", cities: ["Copenhagen", "Aarhus"] },
  { name: "Belgium", code: "BE", cities: ["Brussels", "Antwerp"] },
  { name: "Austria", code: "AT", cities: ["Vienna", "Salzburg"] },
  { name: "Poland", code: "PL", cities: ["Warsaw", "Kraków", "Gdańsk"] },
  { name: "Ireland", code: "IE", cities: ["Dublin", "Cork"] },
  { name: "New Zealand", code: "NZ", cities: ["Auckland", "Wellington", "Christchurch"] },
  { name: "Argentina", code: "AR", cities: ["Buenos Aires", "Córdoba"] },
  { name: "Chile", code: "CL", cities: ["Santiago", "Valparaíso"] },
  { name: "Colombia", code: "CO", cities: ["Bogotá", "Medellín", "Cartagena"] },
  { name: "Israel", code: "IL", cities: ["Tel Aviv", "Jerusalem", "Haifa"] },
  { name: "Qatar", code: "QA", cities: ["Doha"] },
  { name: "Kuwait", code: "KW", cities: ["Kuwait City"] },
  { name: "Bangladesh", code: "BD", cities: ["Dhaka", "Chittagong"] },
  { name: "Pakistan", code: "PK", cities: ["Karachi", "Lahore", "Islamabad"] },
  { name: "Sri Lanka", code: "LK", cities: ["Colombo", "Kandy"] },
  { name: "Nepal", code: "NP", cities: ["Kathmandu", "Pokhara"] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("countries", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      code: { type: Sequelize.STRING, allowNull: false, unique: true },
    });

    await queryInterface.createTable("cities", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      countryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "countries", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING, allowNull: false },
    });
    await queryInterface.addIndex("cities", ["countryId", "name"], { unique: true, name: "cities_country_id_name_unique" });

    const insertedCountries = await queryInterface.bulkInsert(
      "countries",
      COUNTRIES_WITH_CITIES.map((country) => ({ name: country.name, code: country.code })),
      { returning: true }
    );

    const cityRows = COUNTRIES_WITH_CITIES.flatMap((country, index) => {
      const countryId = insertedCountries[index].id;
      return country.cities.map((cityName) => ({ countryId, name: cityName }));
    });
    await queryInterface.bulkInsert("cities", cityRows);

    await queryInterface.createTable("trips", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      // organizationId/employeeId — auth-service's Organization/Employee,
      // cross-service, no FK (real constraint can't span two databases; see
      // claim-service/CLAUDE.md's "Cross-service reads"). Losing the
      // CASCADE here is a real, accepted consequence — a deleted Employee in
      // auth-service no longer cascade-deletes their Trips here.
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      startAt: { type: Sequelize.DATE, allowNull: false },
      endAt: { type: Sequelize.DATE, allowNull: false },
      startCityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cities", key: "id" },
      },
      endCityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "cities", key: "id" },
      },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "new" },
      totalAmount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      approvedAmount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("trips", ["employeeId"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("trips");
    await queryInterface.dropTable("cities");
    await queryInterface.dropTable("countries");
  },
};
