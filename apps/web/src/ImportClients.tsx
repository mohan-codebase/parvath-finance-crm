import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Download, Upload } from "lucide-react";
import { useWrite } from "./api";
import { Back, Badge, FormError, PageHeading, Panel } from "./components";
export default function ImportClients() {
  const write = useWrite(),
    [preview, setPreview] = useState<any>(),
    [result, setResult] = useState<any>(),
    [error, setError] = useState("");
  return (
    <>
      <Back />
      <PageHeading
        title="Import Clients"
        subtitle="Preview every row before adding contacts to your workspace."
      />
      <Panel
        title="1. Prepare your file"
        action={
          <a className="button" href="/api/clients/template">
            <Download size={17} />
            Download template
          </a>
        }
      >
        <p>
          CSV columns: name, phone, email, kind, city, state, source. Name and
          phone are required. kind must be Individual or Business. Maximum 500
          rows / 1 MB. Duplicate contacts are skipped, never overwritten.
        </p>
        <label className="upload-zone">
          <Upload size={28} />
          <strong>Choose a clients CSV</strong>
          <input
            aria-label="Clients CSV"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (!f.name.endsWith(".csv") || f.size > 1000000) {
                setError("Choose a CSV smaller than 1 MB");
                return;
              }
              setError("");
              try {
                const r = await write.mutateAsync({
                  path: "/clients/import/preview",
                  body: { csv: await f.text() },
                });
                setPreview(r.data);
                setResult(null);
              } catch {
                /* Error rendered below */
              }
            }}
          />
        </label>
        <FormError error={error ? new Error(error) : write.error} />
      </Panel>
      {preview && !result && (
        <Panel
          title="2. Review import"
          action={
            <button
              className="primary"
              disabled={
                write.isPending || !preview.rows.some((r: any) => !r.error)
              }
              onClick={async () => {
                const r = await write.mutateAsync({
                  path: `/clients/import/${preview.id}/commit`,
                });
                setResult(r.data.result);
              }}
            >
              Import {preview.rows.filter((r: any) => !r.error).length} valid
              rows
            </button>
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r: any) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.data.name}</td>
                    <td>{r.data.phone}</td>
                    <td>{r.data.email}</td>
                    <td>
                      {r.error ? (
                        <span className="field-error">{r.error}</span>
                      ) : (
                        <Badge tone="mint">Ready</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {result && (
        <Panel title="Import complete">
          <CheckCircle className="text-teal-700" size={40} />
          <h2>
            {result.created} clients added · {result.skipped} rows skipped
          </h2>
          {result.errors.map((e: any) => (
            <p key={e.row}>
              Row {e.row}: {e.error}
            </p>
          ))}
          <Link className="button primary" to="/clients">
            View Clients
          </Link>
        </Panel>
      )}
    </>
  );
}
