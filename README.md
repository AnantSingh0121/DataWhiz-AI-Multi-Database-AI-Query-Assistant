## DataWhiz AI – Multi-Database AI Query Assistant

![alt text](<Screenshot 2025-12-10 200852.png>)

### Project Overview

**DataWhiz AI** is a cutting-edge query assistant designed to bridge the gap between natural language and complex database queries. It enables users to "talk to their data" by instantly converting human language into executable queries for both relational (SQL) and non-relational (MongoDB) databases. Beyond simple conversion, it executes the query, provides real-time results and generates an AI-driven explanation with optimization suggestions.

### Key Features

* **Multi-Database Support:** Seamlessly switch between generating and executing queries for **MySQL** (SQL) and **MongoDB** (NoSQL) databases.
* **Intelligent Query Generation:** Utilizes an advanced LLM (`meta-llama/llama-4-maverick-17b-128e-instruct`) to generate complex, domain-specific queries from natural language input.
* **AI-Driven Insights:** Provides three key outputs for every query:
    1.  **Generated Query:** The raw SQL or MongoDB code.
    2.  **Human-Readable Explanation:** A clear breakdown of what the query does.
    3.  **Optimization Suggestions:** Tips to improve query performance.
* **Real-Time Data Insights:** Displays most **frequent queries**, **frequent tables/collections** and allows users to view the **schema structure** and **sample data** for any table/collection in a live preview modal.
* **Robust Query Safety:** **Completely blocks** all destructive commands (e.g., `DROP`, `DELETE`, `UPDATE`, `TRUNCATE`, `DROP COLLECTION`) before execution, ensuring a read-only environment.
* **Dynamic Results Visualization:** Automatically detects numeric data to generate relevant charts and graphs, improving data comprehension.
* **Modern UI/UX:** A responsive, dark-mode-first interface built with React and TailwindCSS, featuring a clean side-by-side query and results panel.

### Tech Stack

| Category | Technology | Description |
| :---: | :---: | :---: |
| **Backend** | FastAPI, Python | High-performance asynchronous API framework. |
| **Databases** | MySQL (SQL), MongoDB (NoSQL) | Multi-database support using an E-commerce schema. |
| **DB Connectors**| SQLAlchemy, PyMongo | Robust and secure ORM and native MongoDB driver. |
| **LLM** | Groq (meta-llama/llama-4-maverick-17b-128e-instruct - on_demand) | AI engine for query generation and explanation/optimization. |
| **Frontend** | React, TailwindCSS, Charts | Modern, state-of-the-art UI development and styling. |
| **State** | React Hooks, Context API | Efficient state management for a real-time feel. |

### Architecture and Data Flow

The architecture follows a standard three-tier model, ensuring separation of concerns, scalability and security.

1.  **User Input (Frontend):** The user enters a natural language prompt and selects the target database type (SQL or MongoDB).
2.  **Query Generation (Backend/LLM):** FastAPI receives the request and sends the user's prompt, along with the required schema context, to the **LLM**.
3.  **Safety & Execution (Backend/Database):**
    * The generated query is immediately passed through a **Safety Validation Layer** to block destructive commands.
    * The safe query is executed against the respective database (MySQL via SQLAlchemy or MongoDB via PyMongo).
4.  **Enrichment (Backend/LLM):** The raw query, execution status and results are sent back to the LLM to generate the **explanation** and **optimization suggestions**.
5.  **Output (Frontend):** The React frontend receives the complete package (query, results, explanation, tips) and renders the results in a table and dynamic charts.

### Getting Started

#### Prerequisites

* Python 3.10+
* Node.js and npm (for the React Frontend)
* Running instances of **MySQL** and **MongoDB**

#### 1. Configuration

Create a `.env` file in the root directory and populate it with your credentials and database connection strings:

```env
# LLM Configuration
GROQ_API_KEY=***************************************
MODEL=meta-llama/llama-4-maverick-17b-128e-instruct-on_demand
# Database Configuration
SQL_DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/ecommerce_db
MONGO_URI=mongodb://localhost:27017/datawhiz_db
```

#### 2. Backend Setup (FastAPI)
```
# Clone the repository
git clone [YOUR_REPO_URL]
cd [PROJECT_NAME]/backend
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate # On Windows: .\venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the FastAPI server
uvicorn main:app --reload
```

#### 3. Frontend Setup (React)
```
# Navigate to the frontend directory
cd [PROJECT_NAME]/frontend
# Install dependencies
npm install
# Start the React development server
npm start
```
#### 4. Database Schema (E-commerce Domain)

### MySQL Tables

| Table      | Key Fields                                  | Purpose                       |
| :---: | :---: | :---: |
| customers  | customer_id, name, country, registration_date | Relational customer details  |
| products   | product_id, name, category, price, stock_quantity | Relational product catalog |
| orders     | order_id, customer_id, total_amount, status | Relational order summaries   |

### MongoDB Collections

| Collection | Key Fields                                  | Purpose                        |
| :---: | :---: | :---: |
| users      | user_id, name, email, age, country         | NoSQL user profile flexibility |
| events     | event_id, user_id, event_type, timestamp, properties | NoSQL tracking for site activity |

---

#### 5. Query Safety Enforcement

Safety is critical. Blocked commands prevent state-altering queries:

**SQL Blocked Commands:**
```sql
DELETE, DROP, UPDATE, ALTER, TRUNCATE, INSERT
```
**MongoDB Blocked Commands:**
```sql
drop, deleteMany, deleteOne, updateMany, updateOne, insert
```
