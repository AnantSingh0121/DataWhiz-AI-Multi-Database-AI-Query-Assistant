import { useState } from "react";
import "./App.css";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import QueryInput from "./components/QueryInput";
import ResultsPanel from "./components/ResultsPanel";
import DatabaseInsights from "./components/DatabaseInsights";
import SchemaPreview from "./components/SchemaPreview";

function App() {
  const [queryResponse, setQueryResponse] = useState(null);
  const [executeResponse, setExecuteResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schemaData, setSchemaData] = useState(null);
  const [showSchema, setShowSchema] = useState(false);

  const handleQuerySubmit = async (queryData) => {
    setQueryResponse(queryData);
  };

  const handleExecuteResults = async (executeData) => {
    setExecuteResponse(executeData);
  };

  const handleViewSchema = async (dbType, name) => {
    setShowSchema(true);
    setSchemaData({ dbType, name });
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground grid-background">
        <Toaster position="top-right" />
        
        <header className="border-b border-border/50 bg-card/40 backdrop-blur-md">
          <div className="px-6 py-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-heading text-white">
              DataWhiz AI
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-body">
              Talk to your data, any database
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-[calc(100vh-100px)] overflow-hidden">
          <aside className="hidden lg:block lg:col-span-2 h-full overflow-y-auto">
            <DatabaseInsights onViewSchema={handleViewSchema} />
          </aside>

          <section className="col-span-1 lg:col-span-5 flex flex-col gap-4 h-full overflow-y-auto">
            <QueryInput 
              onQuerySubmit={handleQuerySubmit}
              onExecuteResults={handleExecuteResults}
              onViewSchema={handleViewSchema}
            />
          </section>

          <section className="col-span-1 lg:col-span-5 flex flex-col gap-4 h-full border-l border-border/50 bg-black/20 overflow-y-auto">
            <ResultsPanel 
              queryResponse={queryResponse}
              executeResponse={executeResponse}
            />
          </section>
        </main>

        {showSchema && schemaData && (
          <SchemaPreview
            dbType={schemaData.dbType}
            name={schemaData.name}
            onClose={() => setShowSchema(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;