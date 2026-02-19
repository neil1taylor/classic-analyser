import React from 'react';
import { Link } from '@carbon/react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  paragraphStyle,
  listStyle,
  codeBlockStyle,
  warningBlockStyle,
} from '../docsStyles';

const GettingStartedSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Getting Started
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Set up access and start exploring your IBM Cloud infrastructure
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Overview</h3>
      <p style={paragraphStyle}>
        The IBM Cloud Infrastructure Explorer is a web-based inventory and analysis tool for
        IBM Cloud Classic (SoftLayer) and VPC infrastructure. It collects data from 27+ Classic
        API resource types and 21 VPC resource types (across all VPC regions), displays them in
        interactive tables, and exports to XLSX.
      </p>
      <p style={paragraphStyle}>
        <strong>Who it&apos;s for:</strong> IBM Tech Sellers, Client Engineers, and Infrastructure
        Admins who need visibility into Classic and VPC infrastructure for inventory, migration
        planning, and cost analysis.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Quick Start</h3>
      <ol style={listStyle}>
        <li>
          Obtain an IBM Cloud API key from the{' '}
          <Link
            href="https://cloud.ibm.com/iam/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            inline
          >
            IBM Cloud console
          </Link>.
        </li>
        <li>Enter your API key on the login page and click <strong>Connect</strong>.</li>
        <li>Once authenticated, click <strong>Collect Data</strong> to retrieve your infrastructure resources.</li>
        <li>Browse your resources using the sidebar navigation and data tables.</li>
      </ol>
      <p style={paragraphStyle}>
        Your API key is stored only in browser memory and is never saved to disk or sent to
        any server other than the IBM Cloud APIs. A 60-minute inactivity timeout
        automatically clears the key.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Creating an API Key</h3>
      <p style={paragraphStyle}>
        This guide walks through creating a Service ID with the minimum permissions required by
        this application using the <code>ibmcloud</code> CLI. The app only performs <strong>read-only</strong> operations.
      </p>

      <h4 style={subHeadingStyle}>Prerequisites</h4>
      <ul style={listStyle}>
        <li>
          <Link
            href="https://cloud.ibm.com/docs/cli?topic=cli-getting-started"
            target="_blank"
            rel="noopener noreferrer"
            inline
          >
            IBM Cloud CLI
          </Link>{' '}
          installed.
        </li>
        <li>Logged in with sufficient privileges to create Service IDs and assign policies.</li>
      </ul>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud login --sso   # or: ibmcloud login -u <email> -p <password>`}</code>
      </pre>
      <p style={paragraphStyle}>Target the correct account (if you have multiple):</p>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud target -c <ACCOUNT_ID>`}</code>
      </pre>

      <h4 style={subHeadingStyle}>Step 1: Create a Service ID</h4>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud iam service-id-create infra-explorer \\
  --description "Read-only Service ID for IBM Cloud Infrastructure Explorer"`}</code>
      </pre>
      <p style={paragraphStyle}>
        Note the <strong>Service ID</strong> value in the output (format: <code>ServiceId-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>).
      </p>
      <pre style={codeBlockStyle}>
        <code>{`# Store it in a variable for convenience
SERVICE_ID="ServiceId-<paste-your-id-here>"`}</code>
      </pre>

      <h4 style={subHeadingStyle}>Step 2: Assign IAM Policies</h4>
      <p style={paragraphStyle}><strong>VPC Infrastructure Services &mdash; Viewer</strong> (all resource types, all regions):</p>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud iam service-policy-create "$SERVICE_ID" \\
  --service-name is \\
  --roles Viewer`}</code>
      </pre>
      <p style={paragraphStyle}>
        This grants read-only access to all VPC resource types across all regions.
      </p>

      <p style={paragraphStyle}><strong>Transit Gateway &mdash; Viewer:</strong></p>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud iam service-policy-create "$SERVICE_ID" \\
  --service-name transit \\
  --roles Viewer`}</code>
      </pre>

      <p style={paragraphStyle}><strong>Classic Infrastructure Permissions:</strong></p>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud iam service-policy-create "$SERVICE_ID" \\
  --service-name is \\
  --roles Viewer \\
  --service-type classic-infrastructure`}</code>
      </pre>

      <div style={warningBlockStyle}>
        <strong>Important:</strong> Classic infrastructure permissions on Service IDs have limitations.
        If the above command does not grant sufficient access, you may need to use a <strong>user API
        key</strong> instead. In that case, ensure the user account has the following classic infrastructure
        permissions assigned via <strong>Manage &gt; Access (IAM) &gt; Users &gt; [user] &gt; Classic
        infrastructure</strong>:
        <ul style={{ ...listStyle, marginTop: '0.5rem', marginBottom: 0 }}>
          <li><strong>Account:</strong> View account summary, view all hardware, view all virtual servers</li>
          <li><strong>Network:</strong> View bandwidth statistics, manage port control, add/edit/view VLAN spanning</li>
          <li><strong>Services:</strong> View DNS, manage DNS, view certificates (SSL), manage certificates (SSL), view storage, manage storage</li>
        </ul>
        <p style={{ ...paragraphStyle, marginTop: '0.5rem', marginBottom: 0 }}>
          Alternatively, assign the <strong>View Only</strong> classic infrastructure permission set which covers all required read access.
        </p>
      </div>

      <h4 style={subHeadingStyle}>Step 3: Create an API Key</h4>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud iam service-api-key-create infra-explorer-key "$SERVICE_ID" \\
  --description "API key for IBM Cloud Infrastructure Explorer" \\
  --output-format json`}</code>
      </pre>
      <p style={paragraphStyle}>
        <strong>Save the <code>apikey</code> value immediately</strong> &mdash; it cannot be retrieved again after creation.
      </p>

      <div style={warningBlockStyle}>
        <strong>Security:</strong> Store the key securely. Do not commit it to source control. Delete
        the key file after importing it into the application.
      </div>

      <h4 style={subHeadingStyle}>Step 4: Verify the Key Works</h4>
      <p style={paragraphStyle}>Test IAM token exchange:</p>
      <pre style={codeBlockStyle}>
        <code>{`curl -s -X POST "https://iam.cloud.ibm.com/identity/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<YOUR_API_KEY>" \\
  | jq .access_token`}</code>
      </pre>

      <p style={paragraphStyle}>Test a Classic Infrastructure API call:</p>
      <pre style={codeBlockStyle}>
        <code>{`API_KEY="<YOUR_API_KEY>"
AUTH=$(echo -n "apikey:\${API_KEY}" | base64)

curl -s "https://api.softlayer.com/rest/v3.1/SoftLayer_Account/getObject" \\
  -H "Authorization: Basic \${AUTH}" \\
  | jq .companyName`}</code>
      </pre>

      <h4 style={subHeadingStyle}>Step 5: Cleanup / Revocation</h4>
      <p style={paragraphStyle}>When you no longer need the key:</p>
      <pre style={codeBlockStyle}>
        <code>{`ibmcloud iam service-api-key-delete infra-explorer-key "$SERVICE_ID"
ibmcloud iam service-id-delete "$SERVICE_ID"`}</code>
      </pre>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Importing Data (Offline Mode)</h3>
      <p style={paragraphStyle}>
        You can import previously exported XLSX files to view data without connecting to the
        IBM Cloud API. This is useful for offline analysis or sharing data between team members.
      </p>
      <ol style={listStyle}>
        <li>On the login page, click the <strong>Import XLSX</strong> button.</li>
        <li>Select an XLSX file that was previously exported from this application.</li>
        <li>The application will parse the worksheets and populate the data tables.</li>
        <li>An info banner at the top of the dashboard indicates you are viewing imported data.</li>
        <li>Click <strong>Clear &amp; Return</strong> to discard the imported data and return to the login page.</li>
      </ol>
      <p style={paragraphStyle}>
        The import feature recognises worksheets by their standard names (e.g., &quot;vVirtualServers&quot;,
        &quot;vVLANs&quot;). Worksheets with unrecognised names are skipped.
      </p>
    </section>
  </div>
);

export default GettingStartedSection;
