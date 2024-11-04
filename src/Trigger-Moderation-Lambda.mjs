import { RekognitionClient, StartContentModerationCommand, GetContentModerationCommand, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";
import { DynamoDBClient, PutItemCommand, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

// Initialize AWS SDK clients
const rekognitionClient = new RekognitionClient({ region: 'us-east-1' });
const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const MAX_POLL_TIME_MS = 900000; // 15 minutes (Lambda max runtime)

export const handler = async (event) => {
    try {
        // Parse input from API Gateway
        const { userId, fileKey } = JSON.parse(event.body);

        console.log("UserId: ", userId);
        console.log("FileKey: ", fileKey);

        // Check if the uploaded file is an image or video
        const isVideo = fileKey.match(/\.(mp4|mov|avi)$/i);
        let responseData;

        if (isVideo) {
            // Start video moderation
            const moderationCommand = new StartContentModerationCommand({
                Video: { S3Object: { Bucket: "content-moderation-uploads", Name: fileKey } }
            });
            const moderationJob = await rekognitionClient.send(moderationCommand);
            const jobId = moderationJob.JobId;

            // Save the initial job entry in DynamoDB with IN_PROGRESS status
            await dynamoDBClient.send(new PutItemCommand({
                TableName: 'ModerationResults',
                Item: {
                    VideoID: { S: fileKey },
                    JobID: { S: jobId },
                    UserID: { S: userId },
                    Status: { S: "IN_PROGRESS" },
                    UploadTime: { S: new Date().toISOString() },
                    ModerationTags: { S: "" },
                    Timestamps: { S: "" }
                }
            }));

            // Poll Rekognition until job completes or max runtime is reached
            const startTime = Date.now();
            let jobStatus = "IN_PROGRESS";

            while (jobStatus === "IN_PROGRESS" && (Date.now() - startTime) < MAX_POLL_TIME_MS) {
                // Wait before polling again
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

                // Check job status
                const resultCommand = new GetContentModerationCommand({ JobId: jobId });
                const result = await rekognitionClient.send(resultCommand);
                jobStatus = result.JobStatus;

                if (jobStatus === "SUCCEEDED") {
                    // Extract moderation results
                    const labels = result.ModerationLabels.map(label => label.ModerationLabel.Name);
                    const timestamps = result.ModerationLabels.map(label => label.Timestamp);
                    const status = labels.length > 0 ? "failed" : "passed";

                    // Update DynamoDB with final moderation results
                    await dynamoDBClient.send(new UpdateItemCommand({
                        TableName: 'ModerationResults',
                        Key: { VideoID: { S: fileKey } },
                        UpdateExpression: "set #status = :status, ModerationTags = :tags, Timestamps = :timestamps",
                        ExpressionAttributeNames: { "#status": "Status" },
                        ExpressionAttributeValues: {
                            ":status": { S: status },
                            ":tags": { L: labels.map(tag => ({ S: tag })) },
                            ":timestamps": { L: timestamps.map(ts => ({ N: ts.toString() })) }
                        }
                    }));
                    console.log("Moderation results updated:", labels, timestamps);

                    // Get updated row for response
                    responseData = await dynamoDBClient.send(new GetItemCommand({
                        TableName: 'ModerationResults',
                        Key: { VideoID: { S: fileKey } }
                    }));

                    return {
                        statusCode: 200,
                        headers: {
                            'Access-Control-Allow-Origin': 'http://localhost:5173',
                            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                        },
                        body: JSON.stringify({
                            message: "Success",
                            data: {
                                VideoID: responseData.Item.VideoID.S,
                                JobID: responseData.Item.JobID.S,
                                UserID: responseData.Item.UserID.S,
                                Status: responseData.Item.Status.S,
                                UploadTime: responseData.Item.UploadTime.S,
                                ModerationTags: responseData.Item.ModerationTags.L.map(tag => tag.S), // Extract tags correctly
                                Timestamps: responseData.Item.Timestamps.L.map(ts => parseInt(ts.N))
                            }
                        }),
                    };
                }
            }
            console.log("Job still in progress. Exiting due to Lambda max runtime.");
        } else {
            // Image moderation (synchronous processing)
            const moderationResponse = await rekognitionClient.send(new DetectModerationLabelsCommand({
                Image: { S3Object: { Bucket: "content-moderation-uploads", Name: fileKey } }
            }));
            const labels = moderationResponse.ModerationLabels.map(label => label.Name);
            const status = labels.length > 0 ? "failed" : "passed";

            // Update DynamoDB with moderation results for the image
            await dynamoDBClient.send(new PutItemCommand({
                TableName: 'ModerationResults',
                Item: {
                    VideoID: { S: fileKey },
                    JobID: { S: "N/A" },
                    UserID: { S: userId },
                    Status: { S: status },
                    UploadTime: { S: new Date().toISOString() },
                    ModerationTags: { S: labels.join(", ") },
                    Timestamps: { S: "" }
                }
            }));
            console.log("Image moderation results saved:", labels);

            // Get updated row for response
            responseData = await dynamoDBClient.send(new GetItemCommand({
                TableName: 'ModerationResults',
                Key: { VideoID: { S: fileKey } }
            }));

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': 'http://localhost:5173',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                body: JSON.stringify({
                    message: "Success",
                    data: {
                        VideoID: responseData.Item.VideoID.S,
                        JobID: responseData.Item.JobID.S,
                        UserID: responseData.Item.UserID.S,
                        Status: responseData.Item.Status.S,
                        UploadTime: responseData.Item.UploadTime.S,
                        ModerationTags: responseData.Item.ModerationTags.S,
                        Timestamps: responseData.Item.Timestamps.S
                    }
                }),
            };
        }
    } catch (error) {
        console.error("Error in Lambda moderation process:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
