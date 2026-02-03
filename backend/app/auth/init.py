from .models import User

def init_auth_system(app, db):
    """
    Initializes the auth system, creates tables, and seeds the default admin.
    Called inside the app factory context.
    """
    with app.app_context():
        # MANDATE: Create only missing tables (Safe for SQLite)
        db.create_all()
        
        # Check for ANY existing admin
        if not User.query.filter_by(role='admin').first():
            print(">>> [SECURITY SEED] No admin found. Creating default admin...")
            admin = User(
                username='admin',
                email='admin@wca.com',
                role='admin'
            )
            # Default creds: admin / Admin123!@#
            admin.set_password('Admin123!@#')
            db.session.add(admin)
            db.session.commit()
            print(">>> [SECURITY SEED] Default admin created (admin / Admin123!@#)")
        else:
            print(">>> [SECURITY SEED] Admin user exists. Skipping seed.")
