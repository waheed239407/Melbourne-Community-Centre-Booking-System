-- Execute after a booking, staff decision, and cancellation have been demonstrated.
SELECT r.room_name, c.centre_name, r.capacity
FROM rooms r JOIN community_centres c ON c.centre_id=r.centre_id ORDER BY r.room_id;

SELECT b.booking_id, r.room_name, b.start_time, b.end_time,
       b.attendees, b.status, b.decided_at, b.cancelled_at
FROM bookings b JOIN rooms r ON r.room_id=b.room_id
ORDER BY b.requested_at DESC LIMIT 15;

SELECT action, entity_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 15;
SELECT notification_type, delivery_status FROM notifications ORDER BY created_at DESC LIMIT 15;
