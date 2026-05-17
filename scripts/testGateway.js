const gatewayUrl = process.env.GATEWAY_GRAPHQL_URL || 'http://localhost:3000/graphql';

async function sendGraphQL(query, variables) {
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  const body = await response.json();
  if (body.errors) {
    throw new Error(JSON.stringify(body.errors, null, 2));
  }
  return body.data;
}

async function run() {
  const recordActionMutation = `
    mutation RecordAction($student_id: String!, $course_id: String!) {
      recordAction(
        student_id: $student_id
        course_id: $course_id
        action_type: "video_watched"
        resource_id: "video-1"
        time_spent_seconds: 420
        course_total_videos: 4
        course_total_quizzes: 1
      ) {
        progress {
          percentage
          completed
        }
      }
    }
  `;

  const dashboardQuery = `
    query Dashboard($student_id: String!, $course_id: String!) {
      dashboard(student_id: $student_id, course_id: $course_id) {
        progress {
          percentage
          time_spent_seconds
        }
        certificate {
          id
          pdf_path
        }
      }
    }
  `;

  const variables = {
    student_id: 'student-1',
    course_id: 'course-1'
  };

  const recordResult = await sendGraphQL(recordActionMutation, variables);
  console.log('Mutation recordAction OK:', recordResult.recordAction.progress);

  const dashboardResult = await sendGraphQL(dashboardQuery, variables);
  console.log('Query dashboard OK:', dashboardResult.dashboard);
}

run().catch((error) => {
  console.error('Gateway integration test failed:', error.message);
  process.exit(1);
});
