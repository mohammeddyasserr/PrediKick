from app.database import SessionLocal
from app.services.match_sync import sync_matches


def main():

    db = SessionLocal()

    try:
        result = sync_matches(db)

        print("Match synchronization completed")
        print(f"Added: {result['added']}")
        print(f"Updated: {result['updated']}")
        print(f"Deleted: {result['deleted']}")

    except Exception as e:

        db.rollback()

        print(f"Match synchronization failed: {e}")

        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()